"""
Celery-задачи: импорт и синхронизация предложений Encar, обогащение деталей,
матчинг подписок, обновление справочника (каталога) и курса валют, автоперевод
новых значений.
"""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Групповой эндпоинт /vehicles отдаёт максимум 20 карточек за запрос; при большем
# числе id Encar обрезает ответ и часть авто остаётся без vin/объёма двигателя/...
ENRICH_CHUNK = 20


@shared_task
def sync_all_profiles():
    """Запускает синхронизацию для всех активных профилей (celery-beat)."""
    from .models import ImportProfile

    ids = list(ImportProfile.objects.filter(is_active=True).values_list("id", flat=True))
    for pid in ids:
        sync_encar_profile.delay(pid)
    logger.info("Запланирована синхронизация %s профилей", len(ids))
    return f"scheduled {len(ids)} profiles"


@shared_task
def sync_encar_profile(profile_id):
    """
    Синхронизирует один профиль: тянет список Encar (страницами до 1000), апсертит
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
    # N/Y/A передаём напрямую: "A" тянет оба рынка одним запросом (CarType.A),
    # не требуя двух раздельных прогонов по N и Y.
    q = build_q(manufacturer, model_group, car_type=profile.car_type)

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
    через ``/v1/readside/vehicles?vehicleIds=`` (чанками по ENRICH_CHUNK=20) и
    обновляет записи Car (vin, объём двигателя, кузов, опции, полный набор фото).
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
def sync_catalog(deep=False, do_translate=True):
    """
    Полная синхронизация справочника Brand -> ModelGroup -> Model из inav Encar.

    Стратегия оптимальна по числу запросов (inav раскрывает дочерние уровни только
    для выбранного узла):
      1) один inav без марки                  -> все марки (EngName/Code);
      2) по одному inav на марку              -> все группы каждой марки;
      3) модели (с кодом поколения)           -> только для марок с активным
         профилем импорта (deep=True -> для всех марок), по одному inav на группу.

    После сбора запускает автоперевод недостающих названий и значений
    (do_translate=True). Вызывается celery-beat раз в сутки и вручную
    (management-команда sync_catalog / действие в админке профилей импорта).
    """
    from .models import Brand, ModelGroup, ImportProfile
    from .encar.client import EncarClient, build_q
    from .encar import catalog

    totals = {"brands": 0, "groups": 0, "models": 0}
    monitored = {
        m for m in ImportProfile.objects.filter(is_active=True)
        .values_list("brand__name_ko", flat=True) if m
    }

    with EncarClient() as client:
        # 1) Все марки (внутренний рынок + импорт)
        try:
            root_inav = client.get_inav(build_q(car_type=None))
            totals["brands"] = catalog.upsert_brands(root_inav)
        except Exception as exc:
            logger.error("sync_catalog: не удалось получить список марок: %s", exc)
            return totals

        brand_kos = list(Brand.objects.values_list("name_ko", flat=True))

        # 2) Группы каждой марки
        for brand_ko in brand_kos:
            try:
                binav = client.get_inav(build_q(brand_ko, car_type=None))
            except Exception as exc:
                logger.error("sync_catalog: inav марки %s: %s", brand_ko, exc)
                continue
            totals["groups"] += catalog.upsert_groups(binav, brand_ko)

            if not (deep or brand_ko in monitored):
                continue

            # 3) Модели — только для отслеживаемых марок (или всех при deep)
            group_kos = list(
                ModelGroup.objects.filter(brand__name_ko=brand_ko)
                .values_list("name_ko", flat=True)
            )
            for group_ko in group_kos:
                try:
                    ginav = client.get_inav(build_q(brand_ko, group_ko, car_type=None))
                except Exception as exc:
                    logger.error("sync_catalog: inav %s/%s: %s", brand_ko, group_ko, exc)
                    continue
                totals["models"] += catalog.upsert_models(ginav, brand_ko, group_ko)

    logger.info("Каталог синхронизирован: %s (deep=%s)", totals, deep)
    if do_translate:
        try:
            auto_translate_unmapped.delay()
        except Exception:  # брокер недоступен (ручной запуск) — переводим синхронно
            auto_translate_unmapped()
    return totals


@shared_task
def auto_translate_unmapped(limit=2000):
    """
    Автоперевод новых значений, не покрытых статическими словарями:
      * значения-перечисления (топливо/КПП/кузов/цвет/регион) из полей *_raw авто;
      * английские названия марок/групп/моделей (name_en) с корейским name_ko.

    Переводы кешируются в ValueTranslation, после чего поля авто (color/
    transmission/region/body_type) и каталога дозаполняются. Безопасно офлайн:
    при недоступности deep-translator непокрытые значения остаются как есть и
    регистрируются как «ожидающие» (видны в админке для ручной правки).
    """
    from .models import Car
    from .encar import normalization as norm, translate

    available = translate.translator_available()
    if not available:
        logger.warning("deep-translator недоступен — будут отмечены значения для ручного перевода")

    translated = 0
    # kind -> поле Car с исходным (сырым) значением источника
    raw_fields = {
        "fuel": "fuel_type_raw",
        "transmission": "transmission_raw",
        "color": "color_raw",
        "seatcolor": "interior_color_raw",
        "body_type": "body_type_raw",
        "region": "region_raw",
    }
    for kind, field in raw_fields.items():
        values = list(
            Car.objects.exclude(**{field: ""})
            .values_list(field, flat=True).distinct()[:limit]
        )
        for value in values:
            if not value or norm.is_known(kind, value):
                continue
            if available:
                ru, en = translate.translate_value(kind, value)
                if ru or en:
                    translated += 1
                else:
                    translate.ensure_pending(kind, value)
            else:
                translate.ensure_pending(kind, value)

    norm.refresh_translation_cache()
    updated = _backfill_car_translations()
    cat_filled = _translate_catalog_gaps() if available else 0

    result = {"translated": translated, "cars_updated": updated, "catalog_filled": cat_filled}
    logger.info("Автоперевод значений завершён: %s", result)
    return result


def _backfill_car_translations() -> int:
    """Пересчитывает переводимые поля авто по обновлённому справочнику
    (<field>_raw -> перевод). Возвращает число обновлённых записей Car."""
    from .models import Car
    from .encar import normalization as norm

    updated = 0
    # (исходное поле, целевое поле, функция перевода -> ru)
    specs = [
        ("color_raw", "color", lambda v: norm.normalize_color(v)[0]),
        ("interior_color_raw", "interior_color", lambda v: norm.normalize_seatcolor(v)[0]),
        ("transmission_raw", "transmission", lambda v: norm.normalize_transmission(v)[1]),
        ("region_raw", "region", lambda v: norm.normalize_region(v)[0]),
        ("body_type_raw", "body_type", lambda v: norm.normalize_body_type(v)[0]),
    ]
    for raw_field, target_field, to_ru in specs:
        for raw in (Car.objects.exclude(**{raw_field: ""})
                    .values_list(raw_field, flat=True).distinct()):
            ru = to_ru(raw)
            if ru and ru != raw:
                updated += (Car.objects.filter(**{raw_field: raw})
                            .exclude(**{target_field: ru})
                            .update(**{target_field: ru}))
    return updated


def _translate_catalog_gaps(limit=1000) -> int:
    """Заполняет name_en у марок/групп/моделей, где он пуст, а name_ko корейский."""
    from .models import Brand, ModelGroup, Model
    from .encar import translate

    filled = 0
    for cls in (Brand, ModelGroup, Model):
        for obj in cls.objects.filter(name_en="").exclude(name_ko="")[:limit]:
            if obj.name_ko.isascii():
                continue  # уже латиница — английское имя не требуется
            en = translate.translate_text(obj.name_ko, target="en")
            if en:
                obj.name_en = en
                obj.save(update_fields=["name_en"])
                filled += 1
    return filled


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
