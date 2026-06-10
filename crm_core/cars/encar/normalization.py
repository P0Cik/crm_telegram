"""
Нормализация корейских значений Encar (перечисления: топливо, КПП, кузов, цвет,
регион). Основной язык этих значений — русский.

Основной способ — словари соответствий (стабильнее, быстрее и точнее, чем
машинный перевод). Каждый словарь отображает корейское значение в кортеж
переводов (RU, EN). Для топлива/КПП дополнительно хранится canonical-код,
используемый для фильтрации в БД.

Если значение неизвестно — оно НЕ теряется: исходное значение сохраняется в
поле *_raw автомобиля и логируется (WARNING) для последующего добавления в
словарь. Так система остаётся полной и не требует ручного вмешательства, чтобы
не сломаться при появлении новых значений.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _record_unmapped(kind: str, value: str) -> None:
    logger.warning("Encar: неизвестное значение [%s]=%r — сохранено как есть (raw)", kind, value)

# --- Топливо (연료 / FuelType) ------------------------------------------------
# value -> (canonical_code, ru, en)
FUEL_TYPE_MAP = {
    "가솔린": ("PETROL", "Бензин", "Gasoline"),
    "디젤": ("DIESEL", "Дизель", "Diesel"),
    "전기": ("ELECTRIC", "Электро", "Electric"),
    "가솔린+전기": ("HYBRID", "Гибрид (бензин)", "Hybrid (gasoline)"),
    "디젤+전기": ("HYBRID", "Гибрид (дизель)", "Hybrid (diesel)"),
    "하이브리드": ("HYBRID", "Гибрид", "Hybrid"),
    "LPG+전기": ("HYBRID", "Гибрид (LPG)", "Hybrid (LPG)"),
    "LPG": ("LPG", "Газ (LPG)", "LPG"),
    "LPG(일반인 구입)": ("LPG", "Газ (LPG)", "LPG"),
    "LPG(일반인)": ("LPG", "Газ (LPG)", "LPG"),
    "가솔린+LPG": ("LPG", "Бензин + газ (LPG)", "Gasoline + LPG"),
    "가솔린+CNG": ("OTHER", "Бензин + газ (CNG)", "Gasoline + CNG"),
    "수소": ("OTHER", "Водород", "Hydrogen"),
    "CNG": ("OTHER", "Газ (CNG)", "CNG"),
    "기타": ("OTHER", "Другое", "Other"),
}

# --- Коробка передач (변속기 / Transmission) ----------------------------------
TRANSMISSION_MAP = {
    "오토": ("AUTO", "Автомат", "Automatic"),
    "자동": ("AUTO", "Автомат", "Automatic"),
    "수동": ("MANUAL", "Механика", "Manual"),
    "CVT": ("CVT", "Вариатор (CVT)", "CVT"),
    "세미오토": ("SEMI_AUTO", "Робот (Semi-Auto)", "Semi-automatic"),
    "DCT": ("DCT", "Робот (DCT)", "DCT"),
}

# --- Тип кузова (차종 / bodyName) ---------------------------------------------
BODY_TYPE_MAP = {
    "SUV": ("Внедорожник (SUV)", "SUV"),
    "세단": ("Седан", "Sedan"),
    "해치백": ("Хэтчбек", "Hatchback"),
    "왜건": ("Универсал", "Wagon"),
    "쿠페": ("Купе", "Coupe"),
    "컨버터블": ("Кабриолет", "Convertible"),
    "승합": ("Минивэн", "Van"),
    "RV": ("RV", "RV"),
    "화물차": ("Грузовик", "Truck"),
    "경차": ("Малолитражка", "City car"),
    "버스": ("Автобус", "Bus"),
    # Размерные классы (поле bodyName в детальной карточке)
    "소형차": ("Малый класс", "Compact"),
    "준중형차": ("Компактный класс", "Compact"),
    "중형차": ("Средний класс", "Midsize"),
    "준대형차": ("Бизнес-класс", "Full-size"),
    "대형차": ("Большой класс", "Large"),
    "스포츠카": ("Спорткар", "Sports car"),
}

# --- Цвет (색상 / Color) ------------------------------------------------------
COLOR_MAP = {
    "흰색": ("Белый", "White"),
    "흰색투톤": ("Белый (двухцветный)", "White two-tone"),
    "검정색": ("Чёрный", "Black"),
    "검정색투톤": ("Чёрный (двухцветный)", "Black two-tone"),
    "쥐색": ("Тёмно-серый", "Dark gray"),
    "은색": ("Серебристый", "Silver"),
    "은회색": ("Серо-серебристый", "Silver gray"),
    "회색": ("Серый", "Gray"),
    "청색": ("Синий", "Blue"),
    "파란색": ("Синий", "Blue"),
    "하늘색": ("Голубой", "Sky blue"),
    "빨간색": ("Красный", "Red"),
    "갈색": ("Коричневый", "Brown"),
    "베이지색": ("Бежевый", "Beige"),
    "베이지": ("Бежевый", "Beige"),
    "녹색": ("Зелёный", "Green"),
    "노란색": ("Жёлтый", "Yellow"),
    "주황색": ("Оранжевый", "Orange"),
    "보라색": ("Фиолетовый", "Purple"),
    "분홍색": ("Розовый", "Pink"),
    "금색": ("Золотистый", "Gold"),
    "진주색": ("Жемчужный", "Pearl"),
    "기타": ("Другой", "Other"),
}

# --- Регион (지역(시도) / OfficeCityState) ------------------------------------
REGION_MAP = {
    "서울": ("Сеул", "Seoul"),
    "경기": ("Кёнги", "Gyeonggi"),
    "인천": ("Инчхон", "Incheon"),
    "부산": ("Пусан", "Busan"),
    "대구": ("Тэгу", "Daegu"),
    "대전": ("Тэджон", "Daejeon"),
    "광주": ("Кванджу", "Gwangju"),
    "울산": ("Ульсан", "Ulsan"),
    "세종": ("Сечжон", "Sejong"),
    "강원": ("Канвон", "Gangwon"),
    "충북": ("Чхунбук", "Chungbuk"),
    "충남": ("Чхуннам", "Chungnam"),
    "전북": ("Чонбук", "Jeonbuk"),
    "전남": ("Чоннам", "Jeonnam"),
    "경북": ("Кёнбук", "Gyeongbuk"),
    "경남": ("Кённам", "Gyeongnam"),
    "제주": ("Чеджу", "Jeju"),
}

# --- Производитель (제조사 / Manufacturer) ------------------------------------
# В данных Encar импортные марки обычно латиницей (BMW, Audi), а корейские —
# по-корейски. Карта нужна для отображения; при синке Brand создаётся как есть.
BRAND_MAP = {
    "현대": ("Hyundai", "Hyundai"),
    "기아": ("Kia", "Kia"),
    "제네시스": ("Genesis", "Genesis"),
    "쉐보레": ("Chevrolet", "Chevrolet"),
    "벤츠": ("Mercedes-Benz", "Mercedes-Benz"),
    "BMW": ("BMW", "BMW"),
    "아우디": ("Audi", "Audi"),
    "폭스바겐": ("Volkswagen", "Volkswagen"),
    "도요타": ("Toyota", "Toyota"),
    "혼다": ("Honda", "Honda"),
    "렉서스": ("Lexus", "Lexus"),
    "포드": ("Ford", "Ford"),
    "포르쉐": ("Porsche", "Porsche"),
    "볼보": ("Volvo", "Volvo"),
    "테슬라": ("Tesla", "Tesla"),
}


def normalize_fuel(value: str):
    """KO -> (canonical_code, ru, en). По умолчанию OTHER."""
    if not value:
        return ("OTHER", "Другое", "Other")
    key = value.strip()
    if key in FUEL_TYPE_MAP:
        return FUEL_TYPE_MAP[key]
    _record_unmapped("fuel", key)
    return ("OTHER", value, value)


def normalize_transmission(value: str):
    """KO -> (canonical_code, ru, en)."""
    if not value:
        return ("", "", "")
    key = value.strip()
    if key in TRANSMISSION_MAP:
        return TRANSMISSION_MAP[key]
    _record_unmapped("transmission", key)
    return ("OTHER", value, value)


def normalize_color(value: str):
    """KO -> (ru, en)."""
    if not value:
        return ("", "")
    key = value.strip()
    if key in COLOR_MAP:
        return COLOR_MAP[key]
    _record_unmapped("color", key)
    return (value, value)


def normalize_body_type(value: str):
    """KO -> (ru, en)."""
    if not value:
        return ("", "")
    key = value.strip()
    if key in BODY_TYPE_MAP:
        return BODY_TYPE_MAP[key]
    _record_unmapped("body_type", key)
    return (value, value)


def normalize_region(value: str):
    """KO -> (ru, en)."""
    if not value:
        return ("", "")
    key = value.strip()
    if key in REGION_MAP:
        return REGION_MAP[key]
    _record_unmapped("region", key)
    return (value, value)


def normalize_brand(value: str):
    """KO/EN -> (ru, en). Для каталога основной язык — EN."""
    if not value:
        return ("", "")
    key = value.strip()
    if key in BRAND_MAP:
        _ru, en = BRAND_MAP[key]
        return ("", en)
    # Неизвестная марка: en = как есть (часто уже латиница), ru пусто
    return ("", value)
