"""
Работа с валютой. Цена авто хранится только в исходной валюте (воны, KRW);
рубли вычисляются по требованию по актуальному курсу. Курс хранится в БД
(модель ExchangeRate) и кэшируется; статичное значение из настроек служит лишь
запасным вариантом (fallback), если курс ещё ни разу не загружался.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.cache import cache

CACHE_KEY = "exchange_rate:KRW:RUB"
CACHE_TTL = 3600  # 1 час


def _fallback_rate() -> Decimal:
    return Decimal(str(getattr(settings, "KRW_RUB_RATE_FALLBACK", "0.065")))


def get_krw_rub_rate() -> Decimal:
    """Текущий курс RUB за 1 KRW: кэш -> БД -> fallback из настроек."""
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Decimal(cached)

    from .models import ExchangeRate
    obj = ExchangeRate.objects.filter(base="KRW", quote="RUB").first()
    rate = obj.rate if obj else _fallback_rate()
    cache.set(CACHE_KEY, str(rate), CACHE_TTL)
    return rate


def set_krw_rub_rate(rate) -> "ExchangeRate":
    """Сохраняет курс в БД и сбрасывает кэш."""
    from .models import ExchangeRate
    obj, _ = ExchangeRate.objects.update_or_create(
        base="KRW", quote="RUB", defaults={"rate": Decimal(str(rate))}
    )
    cache.set(CACHE_KEY, str(obj.rate), CACHE_TTL)
    return obj


def krw_to_rub(price_krw, rate=None) -> Decimal | None:
    """Конвертирует воны в рубли по текущему (или переданному) курсу."""
    if price_krw is None:
        return None
    if rate is None:
        rate = get_krw_rub_rate()
    return (Decimal(price_krw) * Decimal(rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rub_to_krw(price_rub, rate=None) -> int | None:
    """Конвертирует рубли в воны (для сравнения с хранимой ценой)."""
    if price_rub in (None, ""):
        return None
    if rate is None:
        rate = get_krw_rub_rate()
    rate = Decimal(rate)
    if rate == 0:
        return None
    return int((Decimal(str(price_rub)) / rate).to_integral_value(rounding=ROUND_HALF_UP))
