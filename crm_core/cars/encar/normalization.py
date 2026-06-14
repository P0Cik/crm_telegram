"""
Нормализация значений-перечислений Encar (топливо, КПП, кузов, цвет, цвет салона,
регион). Основной язык отображения этих значений — русский.

ЕДИНЫЙ ИСТОЧНИК — таблица БД ``ValueTranslation`` (см. cars/models.py). Здесь нет
статических словарей соответствий: все переводы (RU/EN), canonical-коды топлива/КПП
и hex-цвета хранятся в БД и наполняются первичным сидом из inav (data-миграция),
автопереводом (encar/translate.py) и вручную через админку. Для скорости таблица
кешируется в памяти процесса (refresh_translation_cache сбрасывает кеш).

Если значение отсутствует в таблице — оно НЕ теряется: возвращается как есть (raw)
и логируется (WARNING). Недостающий перевод позже дозаполнит задача
auto_translate_unmapped. Так система остаётся полной и не ломается при появлении
новых значений источника.

Исключение — марка (normalize_brand): английские названия марок берутся напрямую
из API (inav EngName / detail *EnglishName), а локальный словарь BRAND_MAP служит
офлайновым фолбэком для корейских марок, пока каталог ещё не засеян.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _record_unmapped(kind: str, value: str) -> None:
    logger.warning("Encar: неизвестное значение [%s]=%r — сохранено как есть (raw)", kind, value)


# --- Кеш справочника значений из БД (ValueTranslation) -----------------------
# Структура: {kind: {source_value: (name_ru, name_en, canonical, name_hex)}}.
# Загружается лениво, держится в памяти процесса. После изменения таблицы
# (автоперевод / правка в админке) вызывайте refresh_translation_cache().
_DB_CACHE: dict | None = None


def _load_db() -> dict:
    global _DB_CACHE
    if _DB_CACHE is not None:
        return _DB_CACHE
    data: dict = {}
    try:
        from ..models import ValueTranslation
        qs = ValueTranslation.objects.all().only(
            "kind", "source_value", "name_ru", "name_en", "canonical", "name_hex")
        for vt in qs:
            data.setdefault(vt.kind, {})[vt.source_value] = (
                vt.name_ru, vt.name_en, vt.canonical, vt.name_hex)
    except Exception:  # БД ещё не мигрирована / недоступна — работаем без переводов
        data = {}
    _DB_CACHE = data
    return data


def refresh_translation_cache() -> None:
    """Сбрасывает кеш справочника значений (вызывать после изменения ValueTranslation)."""
    global _DB_CACHE
    _DB_CACHE = None


def _lookup(kind: str, value: str):
    """(name_ru, name_en, canonical, name_hex) из БД-справочника либо None."""
    if not value:
        return None
    return _load_db().get(kind, {}).get(value.strip())


def translation(kind: str, value: str):
    """(ru, en) значения из справочника либо None. Используется задачами перевода."""
    row = _lookup(kind, value)
    if row is None:
        return None
    return (row[0], row[1])


def is_known(kind: str, value: str) -> bool:
    """Есть ли перевод значения в справочнике (для задач автоперевода)."""
    if not value:
        return True
    return _lookup(kind, value) is not None


def normalize_fuel(value: str):
    """KO -> (canonical_code, ru, en). По умолчанию OTHER."""
    if not value:
        return ("OTHER", "Другое", "Other")
    row = _lookup("fuel", value)
    if row:
        return (row[2] or "OTHER", row[0] or value, row[1] or value)
    _record_unmapped("fuel", value.strip())
    return ("OTHER", value, value)


def normalize_transmission(value: str):
    """KO -> (canonical_code, ru, en)."""
    if not value:
        return ("", "", "")
    row = _lookup("transmission", value)
    if row:
        return (row[2] or "OTHER", row[0] or value, row[1] or value)
    _record_unmapped("transmission", value.strip())
    return ("OTHER", value, value)


def normalize_color(value: str):
    """KO -> (ru, en, hex). hex — справочный (может быть пустым)."""
    if not value:
        return ("", "", "")
    row = _lookup("color", value)
    if row:
        return (row[0] or value, row[1] or value, row[3])
    _record_unmapped("color", value.strip())
    return (value, value, "")


def normalize_seatcolor(value: str):
    """KO -> (ru, en, hex) для цвета салона (значения с суффиксом «계열»)."""
    if not value:
        return ("", "", "")
    row = _lookup("seatcolor", value)
    if row:
        return (row[0] or value, row[1] or value, row[3])
    _record_unmapped("seatcolor", value.strip())
    return (value, value, "")


def normalize_body_type(value: str):
    """KO -> (ru, en)."""
    if not value:
        return ("", "")
    row = _lookup("body_type", value)
    if row:
        return (row[0] or value, row[1] or value)
    _record_unmapped("body_type", value.strip())
    return (value, value)


def normalize_region(value: str):
    """KO -> (ru, en)."""
    if not value:
        return ("", "")
    row = _lookup("region", value)
    if row:
        return (row[0] or value, row[1] or value)
    _record_unmapped("region", value.strip())
    return (value, value)


# --- Производитель (제조사 / Manufacturer) ------------------------------------
# Английские названия марок берутся напрямую из API (inav Metadata.EngName /
# detail *EnglishName). Эта карта — офлайновый фолбэк для корейских марок, когда
# каталог ещё не засеян из inav. RU для марок не храним (каталог — на английском).
# value -> en
BRAND_MAP = {
    # Корейские
    "현대": "Hyundai",
    "기아": "Kia",
    "제네시스": "Genesis",
    "쉐보레": "Chevrolet",
    "쉐보레(GM대우)": "Chevrolet",
    "GM대우": "Daewoo",
    "대우": "Daewoo",
    "르노": "Renault",
    "르노삼성": "Renault Korea",
    "르노코리아": "Renault Korea",
    "삼성": "Renault Korea",
    "쌍용": "SsangYong",
    "KG모빌리티": "KG Mobility",
    "제네시스(현대)": "Genesis",
    # Немецкие
    "벤츠": "Mercedes-Benz",
    "메르세데스벤츠": "Mercedes-Benz",
    "아우디": "Audi",
    "폭스바겐": "Volkswagen",
    "미니": "MINI",
    "포르쉐": "Porsche",
    "스마트": "smart",
    "마이바흐": "Maybach",
    "오펠": "Opel",
    # Японские
    "도요타": "Toyota",
    "토요타": "Toyota",
    "렉서스": "Lexus",
    "혼다": "Honda",
    "닛산": "Nissan",
    "인피니티": "Infiniti",
    "마쯔다": "Mazda",
    "마즈다": "Mazda",
    "스바루": "Subaru",
    "미쓰비시": "Mitsubishi",
    "미쯔비시": "Mitsubishi",
    "아큐라": "Acura",
    # Американские
    "포드": "Ford",
    "링컨": "Lincoln",
    "지프": "Jeep",
    "크라이슬러": "Chrysler",
    "캐딜락": "Cadillac",
    "쉐보레(수입)": "Chevrolet",
    "GMC": "GMC",
    "닷지": "Dodge",
    "테슬라": "Tesla",
    "허머": "Hummer",
    # Британские / европейские
    "재규어": "Jaguar",
    "랜드로버": "Land Rover",
    "랜드로버(로버)": "Land Rover",
    "볼보": "Volvo",
    "푸조": "Peugeot",
    "시트로엥": "Citroen",
    "DS": "DS",
    "피아트": "Fiat",
    "벤틀리": "Bentley",
    "롤스로이스": "Rolls-Royce",
    "마세라티": "Maserati",
    "페라리": "Ferrari",
    "람보르기니": "Lamborghini",
    "맥라렌": "McLaren",
    "알파로메오": "Alfa Romeo",
    "애스턴마틴": "Aston Martin",
    "로터스": "Lotus",
    "폴스타": "Polestar",
    "사브": "Saab",
    # Китайские
    "BYD": "BYD",
    "비야디": "BYD",
}


def normalize_brand(value: str) -> str:
    """KO/EN -> en (для каталога основной язык — английский).

    Латиница возвращается как есть (уже годится как англ. имя). Известная корейская
    марка переводится по BRAND_MAP. Неизвестное НЕлатинское значение возвращает ''
    — чтобы name_en остался пустым и был заполнен позже из EngName (inav/деталь),
    а не «застрял» корейским навсегда.
    """
    if not value:
        return ""
    key = value.strip()
    if key in BRAND_MAP:
        return BRAND_MAP[key]
    return key if key.isascii() else ""
