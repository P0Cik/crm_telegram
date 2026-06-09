"""
Celery-задачи: синхронизация предложений Encar, обогащение деталей,
матчинг подписок, обновление курса валют.
"""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def sync_all_profiles():
    """Запускает синхронизацию для всех активных профилей сбора (celery-beat)."""
    from .models import SearchProfile

    ids = list(SearchProfile.objects.filter(is_active=True).values_list("id", flat=True))
    for pid in ids:
        sync_encar_profile.delay(pid)
    logger.info("Запланирована синхронизация %s профилей", len(ids))
    return f"scheduled {len(ids)} profiles"


@shared_task
def sync_encar_profile(profile_id):
    """
    Синхронизирует один профиль: тянет список Encar, апсертит авто/объявления,
    деактивирует пропавшие, обогащает новые и запускает матчинг подписок.
    """
    from .models import SearchProfile
    from .encar.client import EncarClient, build_q
    from .encar import mapper, sync

    try:
        profile = SearchProfile.objects.get(id=profile_id)
    except SearchProfile.DoesNotExist:
        logger.error("SearchProfile #%s не найден", profile_id)
        return None

    q = build_q(profile.manufacturer, profile.model_group or None)
    seen_ids = set()
    new_car_ids = []

    with EncarClient() as client:
        for item in client.iter_list(q, max_pages=profile.max_pages):
            parsed = mapper.parse_list_item(item)
            if not parsed:
                continue
            try:
                car, created = sync.upsert_from_list(parsed)
            except Exception as exc:
                logger.error("Ошибка апсерта %s: %s", parsed.get("external_id"), exc)
                continue
            seen_ids.add(car.external_id)
            if created:
                new_car_ids.append(car.id)

    deactivated = sync.deactivate_stale(profile.manufacturer, profile.model_group, seen_ids)

    profile.last_run_at = timezone.now()
    profile.save(update_fields=["last_run_at"])

    for cid in new_car_ids:
        enrich_car.delay(cid)
    if new_car_ids:
        match_new_cars.delay(new_car_ids)

    result = {
        "profile": profile.name,
        "seen": len(seen_ids),
        "new": len(new_car_ids),
        "deactivated": deactivated,
    }
    logger.info("Синк профиля завершён: %s", result)
    return result


@shared_task
def enrich_car(car_id):
    """Дозагружает детальную карточку и обогащает запись Car."""
    from .models import Car
    from .encar.client import EncarClient
    from .encar import mapper, sync

    try:
        car = Car.objects.get(id=car_id)
    except Car.DoesNotExist:
        return None

    try:
        with EncarClient() as client:
            vehicle = client.get_vehicle(car.external_id)
        detail = mapper.parse_detail(vehicle)
        sync.apply_detail(car, detail)
    except Exception as exc:
        logger.error("Ошибка обогащения car #%s: %s", car_id, exc)
        return None
    return f"enriched car #{car_id}"


@shared_task
def match_new_cars(car_ids):
    """Сопоставляет новые авто с подписками и шлёт уведомления в Telegram."""
    from .matching import match_cars_to_subscriptions

    sent = match_cars_to_subscriptions(car_ids)
    logger.info("Матчинг подписок: отправлено %s уведомлений", sent)
    return f"sent {sent} notifications"


@shared_task
def update_exchange_rates():
    """
    Обновляет курс KRW->RUB. Пытается получить курс ЦБ РФ; при неудаче
    оставляет текущее значение из настроек.
    """
    import httpx
    from django.conf import settings

    try:
        resp = httpx.get("https://www.cbr-xml-daily.ru/daily_json.js", timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
        krw = data["Valute"]["KRW"]
        rate = krw["Value"] / krw["Nominal"]  # RUB за 1 KRW
        settings.KRW_RUB_RATE = rate
        logger.info("Курс KRW->RUB обновлён: %.5f", rate)
        return rate
    except Exception as exc:
        logger.warning("Не удалось обновить курс валют: %s", exc)
        return getattr(settings, "KRW_RUB_RATE", None)
