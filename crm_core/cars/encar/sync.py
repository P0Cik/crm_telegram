"""
Слой синхронизации: запись разобранных данных Encar в БД.

Обычные (не celery) функции — чтобы их можно было вызывать из management-команд
и тестов напрямую. Дедупликация автомобилей — по паре (source, external_id).
"""
from __future__ import annotations

import logging

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from ..models import Brand, Car, CarPhoto, Model
from . import mapper, normalization as norm

logger = logging.getLogger(__name__)

SOURCE = "encar"


def _aware(dt_str):
    if not dt_str:
        return None
    dt = parse_datetime(dt_str)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def get_or_create_brand_model(brand_name: str, model_name: str, model_group: str):
    brand = None
    model = None
    if brand_name:
        ru, en = norm.normalize_brand(brand_name)
        brand, _ = Brand.objects.get_or_create(
            name=brand_name, defaults={"name_en": en, "name_ru": ru}
        )
    if model_name and brand:
        model, _ = Model.objects.get_or_create(
            brand=brand, name=model_name, defaults={"model_group": model_group}
        )
        if model_group and model.model_group != model_group:
            model.model_group = model_group
            model.save(update_fields=["model_group"])
    return brand, model


def _sync_photos(car: Car, photos: list[dict], replace: bool = False):
    if replace:
        car.photos.all().delete()
    for ph in photos:
        CarPhoto.objects.get_or_create(
            car=car, path=ph["path"],
            defaults={"ordering": ph.get("ordering", 0), "category": ph.get("category", "")},
        )


def upsert_from_list(parsed: dict, source: str = SOURCE):
    """Создаёт/обновляет Car + Advertisement по данным из списка."""
    brand, model = get_or_create_brand_model(
        parsed["brand_name"], parsed["model_name"], parsed["model_group"]
    )

    car_defaults = {
        "brand": brand,
        "model": model,
        "badge": parsed["badge"],
        "price_krw": parsed["price_won"],
        "car_price": parsed["price_rub"] or 0,
        "mileage": parsed["mileage"],
        "condition": parsed.get("sales_status", "") or "",
        "year": parsed["year"],
        "year_month": parsed["year_month"],
        "fuel_type": parsed["fuel_type"],
        "fuel_type_raw": parsed["fuel_type_raw"],
        "transmission": parsed["transmission"],
        "transmission_raw": parsed["transmission_raw"],
        "color": parsed["color"],
        "color_raw": parsed["color_raw"],
        "color_hex": parsed["color_hex"],
        "region": parsed["region"],
        "source_url": parsed["source_url"],
        "source_country": "KR",
        "is_active": True,
        "last_seen_at": timezone.now(),
    }
    car, created = Car.objects.update_or_create(
        source=source, external_id=parsed["external_id"], defaults=car_defaults
    )

    # объединяем сырьё метаданных
    meta = dict(car.source_metadata or {})
    meta.update({k: v for k, v in parsed["metadata"].items() if v is not None})
    car.source_metadata = meta
    car.save(update_fields=["source_metadata"])

    # фото из списка (немного); полный набор приедет при обогащении детали
    if parsed["photos"] and not car.photos.exists():
        _sync_photos(car, parsed["photos"])


    return car, created


def apply_detail(car: Car, detail: dict):
    """Обогащает Car данными детальной карточки."""
    fields = {}
    if detail.get("vin"):
        fields["vin"] = detail["vin"]
    for key in ("badge", "fuel_type", "fuel_type_raw",
                "transmission", "transmission_raw", "color", "color_raw",
                "body_type", "description_ko"):
        val = detail.get(key)
        if val:
            fields[key] = val
    if detail.get("year"):
        fields["year"] = detail["year"]
    if detail.get("year_month"):
        fields["year_month"] = detail["year_month"]
    if detail.get("engine_volume") is not None:
        fields["engine_volume"] = detail["engine_volume"]
    if detail.get("seat_count") is not None:
        fields["seat_count"] = detail["seat_count"]
    if detail.get("origin_price_man") is not None:
        fields["origin_price_man"] = detail["origin_price_man"]
    listed = _aware(detail.get("listed_at"))
    if listed:
        fields["listed_at"] = listed
    modified = _aware(detail.get("modified_at"))
    if modified:
        fields["modified_at"] = modified

    if detail.get("price_won") is not None:
        fields["price_krw"] = detail["price_won"]
        fields["car_price"] = detail.get("price_rub") or 0
    if detail.get("mileage") is not None:
        fields["mileage"] = detail["mileage"]

    # бренд/модель при необходимости
    if detail.get("brand_name") and detail.get("model_name"):
        brand, model = get_or_create_brand_model(
            detail["brand_name"], detail["model_name"], detail.get("model_group", "")
        )
        if brand:
            fields["brand"] = brand
        if model:
            fields["model"] = model

    fields["detail_fetched_at"] = timezone.now()

    for k, v in fields.items():
        setattr(car, k, v)
    car.save()

    # коды опций -> metadata
    if detail.get("option_codes"):
        meta = dict(car.source_metadata or {})
        meta["option_codes"] = detail["option_codes"]
        car.source_metadata = meta
        car.save(update_fields=["source_metadata"])

    # полный набор фото
    if detail.get("photos"):
        _sync_photos(car, detail["photos"], replace=True)



    return car


def deactivate_stale(brand_name: str, model_group: str, seen_external_ids, source: str = SOURCE) -> int:
    """
    Помечает is_active=False автомобили в рамках профиля (марка + группа модели),
    которые не встретились в текущем прогоне. Записи не удаляются.
    """
    qs = Car.objects.filter(source=source, is_active=True)
    if brand_name:
        qs = qs.filter(brand__name=brand_name)
    if model_group:
        qs = qs.filter(model__model_group=model_group)
    qs = qs.exclude(external_id__in=list(seen_external_ids))
    count = 0
    for car in qs:
        car.is_active = False
        car.save(update_fields=["is_active"])
        count += 1
    return count
