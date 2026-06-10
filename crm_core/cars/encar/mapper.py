"""
Преобразование JSON-ответов Encar в плоские структуры для сохранения в БД.

Функции возвращают обычные словари (без обращения к БД), чтобы их было удобно
тестировать на фикстурах. Запись в БД выполняет слой синхронизации (encar/sync.py).

Цена возвращается только в исходной валюте (воны, KRW). Конвертация в рубли —
по требованию (см. cars/currency.py), здесь не выполняется.
"""
from __future__ import annotations

import logging

from . import normalization as norm

logger = logging.getLogger(__name__)

MAN = 10_000  # 1 만원 = 10 000 KRW (вон)

# SalesStatus из Encar -> наш canonical-код (Car.SalesStatus)
SALES_STATUS_MAP = {
    "": "ON_SALE",
    "ADVERTISE": "ON_SALE",
    "CONTRACT": "CONTRACT",
    "SOLDOUT": "SOLD",
    "SOLD": "SOLD",
}


def man_to_won(price_man) -> int | None:
    """Цена Encar в 만원 -> воны (KRW)."""
    if price_man in (None, ""):
        return None
    try:
        return int(round(float(price_man))) * MAN
    except (TypeError, ValueError):
        return None


def normalize_sales_status(value) -> str:
    """SalesStatus Encar -> canonical (ON_SALE по умолчанию)."""
    if not value:
        return "ON_SALE"
    return SALES_STATUS_MAP.get(str(value).strip().upper(), "ON_SALE")


def detail_url(external_id) -> str:
    return f"https://fem.encar.com/cars/detail/{external_id}"


def _first_hex(color_expression: str | None) -> str:
    if not color_expression:
        return ""
    return color_expression.split(";")[0].strip()


def parse_list_item(item: dict) -> dict | None:
    """
    Объявление из ``/search/car/list/mobile`` -> словарь полей.

    Возвращает ``None`` для дублей (``ServiceCopyCar != "ORIGINAL"``).
    """
    if item.get("ServiceCopyCar") != "ORIGINAL":
        return None

    external_id = str(item.get("Id"))
    if not external_id or external_id == "None":
        return None

    fuel_code, fuel_ru, _fuel_en = norm.normalize_fuel(item.get("FuelType", ""))
    trans_code, trans_ru, _trans_en = norm.normalize_transmission(item.get("Transmission", ""))
    color_ru, _color_en = norm.normalize_color(item.get("Color", ""))
    region_ru, _region_en = norm.normalize_region(item.get("OfficeCityState", ""))

    form_year = item.get("FormYear")
    year_month = item.get("Year")
    try:
        year = int(form_year) if form_year else int(str(int(year_month))[:4])
    except (TypeError, ValueError):
        year = 0

    price_won = man_to_won(item.get("Price"))

    photos = []
    for ph in item.get("Photos", []) or []:
        loc = ph.get("location")
        if loc:
            photos.append({
                "path": loc,
                "ordering": ph.get("ordering", 0) or 0,
                "category": ph.get("type", "") or "",
            })

    return {
        "external_id": external_id,
        "brand_name": item.get("Manufacturer", "") or "",
        "model_name": item.get("Model", "") or "",
        "model_group": item.get("ModelGroup", "") or "",
        "badge": item.get("Badge", "") or "",
        "year": year,
        "year_month": int(year_month) if year_month else None,
        "fuel_type": fuel_code,
        "fuel_type_raw": item.get("FuelType", "") or "",
        "transmission": trans_ru,
        "transmission_raw": item.get("Transmission", "") or "",
        "color": color_ru,
        "color_raw": item.get("Color", "") or "",
        "color_hex": _first_hex(item.get("ColorExpression")),
        "region": region_ru,
        "region_raw": item.get("OfficeCityState", "") or "",
        "price_won": price_won,
        "mileage": int(item.get("Mileage") or 0),
        "sales_status": normalize_sales_status(item.get("SalesStatus")),
        "source_url": detail_url(external_id),
        "photos": photos,
        # сырьё для source_metadata
        "metadata": {
            "Trust": item.get("Trust"),
            "ServiceMark": item.get("ServiceMark"),
            "AdType": item.get("AdType"),
            "Hotmark": item.get("Hotmark"),
            "BuyType": item.get("BuyType"),
            "SalesStatus": item.get("SalesStatus"),
            "OfficeCityState": item.get("OfficeCityState"),
            "ColorExpression": item.get("ColorExpression"),
        },
    }


def parse_detail(vehicle: dict) -> dict:
    """
    Полная карточка ``/v1/readside/vehicle/{id}`` -> словарь полей для
    обогащения существующей записи Car.
    """
    category = vehicle.get("category", {}) or {}
    spec = vehicle.get("spec", {}) or {}
    manage = vehicle.get("manage", {}) or {}
    contents = vehicle.get("contents", {}) or {}
    options = vehicle.get("options", {}) or {}
    advertisement = vehicle.get("advertisement", {}) or {}
    condition = vehicle.get("condition", {}) or {}

    fuel_code, fuel_ru, _ = norm.normalize_fuel(spec.get("fuelName", ""))
    trans_code, trans_ru, _ = norm.normalize_transmission(spec.get("transmissionName", ""))
    color_ru, _ = norm.normalize_color(spec.get("colorName", ""))
    body_ru, _ = norm.normalize_body_type(spec.get("bodyName", ""))

    photos = []
    for ph in vehicle.get("photos", []) or []:
        path = ph.get("path")
        if path:
            photos.append({
                "path": path,
                "ordering": ph.get("ordering", 0) or 0,
                "category": ph.get("type", "") or "",
            })

    accident = condition.get("accident", {}) or {}
    has_accident = None
    if accident:
        has_accident = bool(accident.get("recordView") or accident.get("resumeView"))

    result = {
        "external_id": str(vehicle.get("vehicleId")),
        "vin": vehicle.get("vin") or None,
        # каталог: корейское название + английское (из *EnglishName)
        "brand_name": category.get("manufacturerName", "") or "",
        "brand_name_en": category.get("manufacturerEnglishName", "") or "",
        "brand_code": category.get("manufacturerCd", "") or "",
        "model_group": category.get("modelGroupName", "") or "",
        "model_group_en": category.get("modelGroupEnglishName", "") or "",
        "model_group_code": category.get("modelGroupCd", "") or "",
        "model_name": category.get("modelName", "") or "",
        "model_name_en": category.get("modelEnglishName", "") or "",
        "model_code": category.get("modelCd", "") or "",
        "badge": category.get("gradeName", "") or "",
        "year_month": int(category["yearMonth"]) if category.get("yearMonth") else None,
        "origin_price_won": man_to_won(category.get("originPrice")),
        "fuel_type": fuel_code,
        "fuel_type_raw": spec.get("fuelName", "") or "",
        "transmission": trans_ru,
        "transmission_raw": spec.get("transmissionName", "") or "",
        "engine_volume": spec.get("displacement"),
        "color": color_ru,
        "color_raw": spec.get("colorName", "") or "",
        "body_type": body_ru,
        "seat_count": spec.get("seatCount"),
        "has_accident_record": has_accident,
        "description_ko": contents.get("text", "") or "",
        "listed_at": manage.get("firstAdvertisedDateTime") or manage.get("registDateTime"),
        "modified_at": manage.get("modifyDateTime"),
        "photos": photos,
        "option_codes": options.get("standard", []) or [],
        "sales_status": normalize_sales_status(advertisement.get("salesStatus")),
        "price_won": man_to_won(advertisement.get("price")),
        "mileage": spec.get("mileage"),
        "vehicle_no": vehicle.get("vehicleNo", ""),
    }
    form_year = category.get("formYear")
    if form_year:
        try:
            result["year"] = int(form_year)
        except (TypeError, ValueError):
            pass
    return result
