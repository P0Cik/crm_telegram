"""
Слой синхронизации: запись разобранных данных Encar в БД.

Обычные (не celery) функции — чтобы их можно было вызывать из management-команд
и тестов напрямую. Дедупликация автомобилей — по паре (source, external_id).
Справочник марок/групп/моделей заполняется автоматически и обогащается
английскими названиями из детальных карточек.
"""
from __future__ import annotations

import logging

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from ..models import Brand, Car, CarPhoto, Model, ModelGroup
from . import normalization as norm

logger = logging.getLogger(__name__)

SOURCE = "encar"


def _ascii_en(value: str) -> str:
    """Если исходное название уже латиницей (X5, 5-Series) — годится как name_en.

    Так поле name_en не остаётся пустым для англоязычных названий из источника
    (требование ТЗ). Корейские значения возвращают '' — их name_en заполнит
    EngName из inav/детали.
    """
    value = (value or "").strip()
    return value if value and value.isascii() else ""


def _aware(dt_str):
    if not dt_str:
        return None
    dt = parse_datetime(dt_str)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _apply_names(obj, *, name_en='', code='') -> bool:
    """
    Обновляет name_en/code справочной записи. name_en (если непустой) считается
    авторитетным (EngName из inav / *EnglishName детали) и перезаписывает имеющееся
    значение — иначе единожды попавший корейский фолбэк остался бы навсегда. code
    заполняется, только если пуст. Возвращает True, если запись изменилась.
    """
    changed = []
    if name_en and obj.name_en != name_en:
        obj.name_en = name_en
        changed.append('name_en')
    if code and not obj.code:
        obj.code = code
        changed.append('code')
    if changed:
        obj.save(update_fields=changed)
    return bool(changed)


def get_or_create_catalog(brand_ko, group_ko='', model_ko='', *, source=SOURCE,
                          brand_en='', brand_code='',
                          group_en='', group_code='',
                          model_en='', model_code=''):
    """
    Создаёт/находит цепочку Brand -> ModelGroup -> Model по корейским названиям.

    EN-названия берутся из EngName (inav) / *EnglishName (деталь). Явный EN
    авторитетен и перезаписывает прежнее значение; name_en не «загрязняется»
    корейским — при отсутствии EN остаётся пустым, а отображение падает на name_ko
    (см. TranslatableNameMixin.display_name). Для марки при отсутствии явного EN
    используется эвристика normalize_brand (известные KO-марки -> английское имя).
    Возвращает (brand, group, model); отсутствующие уровни — None.
    """
    brand = group = model = None
    if not brand_ko:
        return brand, group, model

    brand_default_en = brand_en or norm.normalize_brand(brand_ko)
    brand, _ = Brand.objects.get_or_create(
        source=source, name_ko=brand_ko,
        defaults={"name_en": brand_default_en, "code": brand_code},
    )
    # Перезаписываем только явным EngName, не эвристикой normalize_brand.
    _apply_names(brand, name_en=brand_en, code=brand_code)

    if group_ko:
        group, _ = ModelGroup.objects.get_or_create(
            brand=brand, name_ko=group_ko,
            defaults={"name_en": group_en or _ascii_en(group_ko),
                      "code": group_code, "source": source},
        )
        _apply_names(group, name_en=group_en or _ascii_en(group_ko), code=group_code)

    if model_ko and group:
        model, _ = Model.objects.get_or_create(
            model_group=group, name_ko=model_ko,
            defaults={"name_en": model_en or _ascii_en(model_ko),
                      "code": model_code, "source": source},
        )
        _apply_names(model, name_en=model_en or _ascii_en(model_ko), code=model_code)

    return brand, group, model


def _sync_photos(car: Car, photos: list[dict], replace: bool = False):
    if replace:
        car.photos.all().delete()
    for ph in photos:
        number = ph.get("image_number", 0) or 0
        _, created = CarPhoto.objects.get_or_create(
            car=car, path=ph["path"],
            defaults={"image_number": number,
                      "ordering": ph.get("ordering", 0) or number,
                      "category": ph.get("category", "")},
        )
        # дозаполняем номер у фото, сохранённых до появления поля image_number
        if not created:
            CarPhoto.objects.filter(car=car, path=ph["path"], image_number=0).update(
                image_number=number)


def upsert_from_list(parsed: dict, source: str = SOURCE):
    """Создаёт/обновляет Car по данным из списка объявлений."""
    brand, group, model = get_or_create_catalog(
        parsed["brand_name"], parsed["model_group"], parsed["model_name"], source=source
    )

    car_defaults = {
        "brand": brand,
        "model_group": group,
        "model": model,
        "badge": parsed["badge"],
        "price_krw": parsed["price_won"],
        "mileage": parsed["mileage"],
        "sales_status": parsed["sales_status"],
        "year": parsed["year"],
        "year_month": parsed["year_month"],
        "fuel_type": parsed["fuel_type"],
        "fuel_type_raw": parsed["fuel_type_raw"],
        "transmission": parsed["transmission"],
        "transmission_raw": parsed["transmission_raw"],
        "color": parsed["color"],
        "color_raw": parsed["color_raw"],
        "color_hex": parsed["color_hex"],
        "interior_color": parsed["interior_color"],
        "interior_color_raw": parsed["interior_color_raw"],
        "interior_color_hex": parsed["interior_color_hex"],
        "region": parsed["region"],
        "region_raw": parsed["region_raw"],
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
    for key in ("badge", "badge_en", "vehicle_no", "fuel_type", "fuel_type_raw",
                "transmission", "transmission_raw", "color", "color_raw",
                "body_type", "body_type_raw", "description_ko", "sales_status"):
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
    if detail.get("origin_price_won") is not None:
        fields["origin_price_krw"] = detail["origin_price_won"]
    if detail.get("has_accident_record") is not None:
        fields["has_accident_record"] = detail["has_accident_record"]
    listed = _aware(detail.get("listed_at"))
    if listed:
        fields["listed_at"] = listed
    modified = _aware(detail.get("modified_at"))
    if modified:
        fields["modified_at"] = modified

    if detail.get("price_won") is not None:
        fields["price_krw"] = detail["price_won"]
    if detail.get("mileage") is not None:
        fields["mileage"] = detail["mileage"]

    # каталог: обновляем/создаём с английскими названиями из детали
    if detail.get("brand_name"):
        brand, group, model = get_or_create_catalog(
            detail["brand_name"], detail.get("model_group", ""), detail.get("model_name", ""),
            brand_en=detail.get("brand_name_en", ""), brand_code=detail.get("brand_code", ""),
            group_en=detail.get("model_group_en", ""), group_code=detail.get("model_group_code", ""),
            model_en=detail.get("model_name_en", ""), model_code=detail.get("model_code", ""),
        )
        if brand:
            fields["brand"] = brand
        if group:
            fields["model_group"] = group
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


def deactivate_stale(brand=None, model_group=None, seen_external_ids=(), source: str = SOURCE) -> int:
    """
    Помечает is_active=False автомобили в рамках профиля (марка + группа модели),
    которые не встретились в текущем (полном) прогоне. Записи не удаляются.
    Принимает объекты Brand/ModelGroup (или None).
    """
    qs = Car.objects.filter(source=source, is_active=True)
    if brand is not None:
        qs = qs.filter(brand=brand)
    if model_group is not None:
        qs = qs.filter(model_group=model_group)
    qs = qs.exclude(external_id__in=list(seen_external_ids))
    return qs.update(is_active=False)
