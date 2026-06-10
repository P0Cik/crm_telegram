"""
Celery-задачи: импорт и синхронизация предложений Encar, обогащение деталей,
матчинг подписок, обновление справочника и курса валют.
"""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

ENRICH_CHUNK = 50  # сколько id за один запрос к vehicles?vehicleIds=


@shared_task
def run_all_import_profiles():
    """Запускает импорт для всех активных профилей (celery-beat)."""
    from .models import ImportProfile

    ids = list(ImportProfile.objects.filter(is_active=True).values_list("id", flat=True))
    for pid in ids:
        run_import_profile.delay(pid)
    logger.info("Запланирован импорт %s профилей", len(ids))
    return f"scheduled {len(ids)} profiles"


@shared_task
def run_import_profile(profile_id):
    """
    Импортирует один профиль: тянет список Encar (страницами до 1000), апсертит
    авто, обогащает новые/изменившиеся через групповой эндпоинт vehicles, при
    полном прогоне деактивирует пропавшие. На инкрементальном прогоне (после
    первичной полной выгрузки) применяет ранний останов: объявления отсортированы
    по дате изменения, поэтому при встрече уже известного и неизменившегося
    объявления дальнейшая пагинация прекращается.
    """
    from .models import Car, ImportProfile
    from .encar.client import EncarClient, build_q
    from .encar import mapper, sync

    try:
        profile = ImportProfile.objects.select_related("brand", "model_group").get(id=profile_id)
    except ImportProfile.DoesNotExist:
        logger.error("ImportProfile #%s не найден", profile_id)
        return None

    manufacturer = profile.brand.name_ko
    model_group = profile.model_group.name_ko if profile.model_group_id else None
    q = build_q(manufacturer, model_group)

    seen_ids = set()
    to_enrich = []          # external_id новых/изменившихся
    new_car_ids = []        # db id созданных (для матчинга)
    early_stopped = False
    total = None
    offset = 0
    page = 0

    with EncarClient() as client:
        while page < profile.max_pages:
            data = client.search_list(q, offset=offset, limit=profile.page_size)
            if total is None:
                total = int(data.get("Count", 0) or 0)
            batch = data.get("SearchResults", []) or []
            if not batch:
                break

            stop = False
            for item in batch:
                parsed = mapper.parse_list_item(item)
                if not parsed:
                    continue
                ext = parsed["external_id"]
                existing = (
                    Car.objects.filter(source=sync.SOURCE, external_id=ext)
                    .only("id", "price_krw", "mileage", "sales_status", "is_active")
                    .first()
                )
                # Ранний останов: известное активное и неизменившееся объявление
                if (profile.backfill_completed and existing and existing.is_active
                        and existing.price_krw == parsed["price_won"]
                        and existing.mileage == parsed["mileage"]
                        and existing.sales_status == parsed["sales_status"]):
                    seen_ids.add(ext)
                    stop = True
                    early_stopped = True
                    break

                try:
                    car, created = sync.upsert_from_list(parsed)
                except Exception as exc:
                    logger.error("Ошибка апсерта %s: %s", ext, exc)
                    continue
                seen_ids.add(ext)
                if created:
                    new_car_ids.append(car.id)
                    to_enrich.append(ext)
                elif existing and (existing.price_krw != parsed["price_won"]
                                   or existing.sales_status != parsed["sales_status"]
                                   or car.detail_fetched_at is None):
                    to_enrich.append(ext)

            offset += len(batch)
            page += 1
            if stop:
                break
            if total is not None and offset >= total:
                break

    full_pass = (not early_stopped) and (total is not None and offset >= total)

    if full_pass:
        deactivated = sync.deactivate_stale(profile.brand, profile.model_group, seen_ids)
        if not profile.backfill_completed:
            profile.backfill_completed = True
    else:
        deactivated = 0

    profile.last_run_at = timezone.now()
    profile.save(update_fields=["last_run_at", "backfill_completed"])

    if to_enrich:
        enrich_cars.delay(to_enrich)
    if new_car_ids:
        match_new_cars.delay(new_car_ids)

    result = {
        "profile": profile.name,
        "seen": len(seen_ids),
        "new": len(new_car_ids),
        "to_enrich": len(to_enrich),
        "deactivated": deactivated,
        "full_pass": full_pass,
        "early_stopped": early_stopped,
    }
    logger.info("Импорт профиля завершён: %s", result)
    return result


@shared_task
def enrich_cars(external_ids):
    """
    Групповое обогащение: дозагружает детальные карточки сразу по нескольким id
    через ``/v1/readside/vehicles?vehicleIds=`` (чанками) и обновляет записи Car.
    """
    from .models import Car
    from .encar.client import EncarClient
    from .encar import mapper, sync

    if not external_ids:
        return "no ids"

    enriched = 0
    with EncarClient() as client:
        for i in range(0, len(external_ids), ENRICH_CHUNK):
            chunk = external_ids[i:i + ENRICH_CHUNK]
            try:
                vehicles = client.get_vehicles(chunk)
            except Exception as exc:
                logger.error("Ошибка group-vehicles %s: %s", chunk[:3], exc)
                continue
            by_id = {str(v.get("vehicleId")): v for v in vehicles}
            cars = Car.objects.filter(source=sync.SOURCE, external_id__in=chunk)
            for car in cars:
                vehicle = by_id.get(car.external_id)
                if not vehicle:
                    continue
                try:
                    sync.apply_detail(car, mapper.parse_detail(vehicle))
                    enriched += 1
                except Exception as exc:
                    logger.error("Ошибка обогащения car %s: %s", car.external_id, exc)
    logger.info("Обогащено %s авто", enriched)
    return f"enriched {enriched} cars"


@shared_task
def match_new_cars(car_ids):
    """Сопоставляет новые авто с подписками и шлёт уведомления в Telegram."""
    from .matching import match_cars_to_subscriptions

    sent = match_cars_to_subscriptions(car_ids)
    logger.info("Матчинг подписок: отправлено %s уведомлений", sent)
    return f"sent {sent} notifications"


@shared_task
def sync_catalog(manufacturers=None):
    """
    Обновляет справочник Brand -> ModelGroup -> Model из inav Encar.

    Без аргументов обходит марки активных профилей импорта. inav раскрывает дерево
    моделей только для запрошенной марки, поэтому запросы делаются по каждой марке.
    """
    from .models import ImportProfile
    from .encar.client import EncarClient, build_q
    from .encar import catalog

    if manufacturers is None:
        manufacturers = list(
            ImportProfile.objects.filter(is_active=True)
            .values_list("brand__name_ko", flat=True).distinct()
        )
    manufacturers = [m for m in manufacturers if m]

    totals = {"brands": 0, "groups": 0, "models": 0}
    with EncarClient() as client:
        for man in manufacturers:
            try:
                inav = client.get_inav(build_q(man))
                stats = catalog.upsert_catalog_from_inav(inav)
            except Exception as exc:
                logger.error("Ошибка sync_catalog для %s: %s", man, exc)
                continue
            for k in totals:
                totals[k] += stats.get(k, 0)
    logger.info("Справочник обновлён: %s", totals)
    return totals


@shared_task
def update_exchange_rates():
    """
    Обновляет курс KRW->RUB по данным ЦБ РФ и сохраняет его в БД
    (модель ExchangeRate). При неудаче курс не меняется.
    """
    import httpx
    from .currency import set_krw_rub_rate, get_krw_rub_rate

    try:
        resp = httpx.get("https://www.cbr-xml-daily.ru/daily_json.js", timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
        krw = data["Valute"]["KRW"]
        rate = krw["Value"] / krw["Nominal"]  # RUB за 1 KRW
        set_krw_rub_rate(rate)
        logger.info("Курс KRW->RUB обновлён: %.5f", rate)
        return rate
    except Exception as exc:
        logger.warning("Не удалось обновить курс валют: %s", exc)
        return float(get_krw_rub_rate())
