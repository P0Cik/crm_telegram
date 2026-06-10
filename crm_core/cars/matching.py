"""
Сопоставление новых автомобилей с активными подписками (SearchRequest).

После добавления новых авто система проверяет, подходят ли они под активные
подписки пользователей. Для совпадений отправляется уведомление в Telegram.
Дедупликация — через watermark ``SearchRequest.last_checked_at``: рассматриваются
только авто, впервые обнаруженные позже метки.
"""
from __future__ import annotations

import logging

from django.utils import timezone

from .models import Car, SearchRequest

logger = logging.getLogger(__name__)


def _ci_eq(a, b) -> bool:
    return (a or "").strip().lower() == (b or "").strip().lower()


def car_matches_request(car: Car, req: SearchRequest, rate=None) -> bool:
    """Проверяет соответствие автомобиля фильтрам подписки."""

    # Марка / группа / модель
    if req.brand_id and car.brand_id != req.brand_id:
        return False
    if req.model_group_id and car.model_group_id != req.model_group_id:
        return False
    if req.model_id and car.model_id != req.model_id:
        return False

    # Год
    if req.year_min and (not car.year or car.year < req.year_min):
        return False
    if req.year_max and (not car.year or car.year > req.year_max):
        return False

    # Цена: хранится в вонах, фильтр подписки — в рублях. Сравниваем в рублях.
    mileage = car.mileage
    if req.price_min is not None or req.price_max is not None:
        price_rub = car.price_rub(rate=rate)
        if req.price_min is not None and (price_rub is None or price_rub < req.price_min):
            return False
        if req.price_max is not None and (price_rub is None or price_rub > req.price_max):
            return False
    if req.mileage_min is not None and (mileage is None or mileage < req.mileage_min):
        return False
    if req.mileage_max is not None and (mileage is None or mileage > req.mileage_max):
        return False

    # Объём двигателя (см³ в БД; подписка — в литрах)
    if req.min_engine_volume is not None and car.engine_volume:
        if car.engine_volume < float(req.min_engine_volume) * 1000:
            return False
    if req.max_engine_volume is not None and car.engine_volume:
        if car.engine_volume > float(req.max_engine_volume) * 1000:
            return False

    # Топливо (canonical-код или отображение)
    if req.fuel_type:
        if not (_ci_eq(req.fuel_type, car.fuel_type)
                or _ci_eq(req.fuel_type, car.get_fuel_type_display())):
            return False

    # Прочие фильтры (мягкое совпадение)
    if req.transmission and car.transmission and not _ci_eq(req.transmission, car.transmission):
        return False
    if req.body_type and car.body_type and not _ci_eq(req.body_type, car.body_type):
        return False
    if req.colors and car.color and req.colors.strip().lower() not in (car.color or "").lower():
        return False

    return True


def match_cars_to_subscriptions(car_ids, notifier=None):
    """
    Для каждой активной подписки находит подходящие новые авто и отправляет
    уведомление. Возвращает количество отправленных уведомлений.

    ``notifier`` — функция (user, car, search_request) -> bool; по умолчанию
    используется Telegram-отправитель. В тестах можно подменить.
    """
    if notifier is None:
        from bot.notifications import send_matching_car_notification as notifier

    from .currency import get_krw_rub_rate
    rate = get_krw_rub_rate()

    sent = 0
    requests = (
        SearchRequest.objects
        .filter(status=SearchRequest.Status.TRACKED)
        .select_related("brand", "model_group", "model", "user")
    )
    base_cars = (
        Car.objects.filter(id__in=list(car_ids), is_active=True)
        .select_related("brand", "model_group", "model")
        .prefetch_related("photos")
    )

    now = timezone.now()
    for req in requests:
        watermark = req.last_checked_at
        for car in base_cars:
            if watermark and car.first_seen_at and car.first_seen_at <= watermark:
                continue
            if car_matches_request(car, req, rate=rate):
                try:
                    if notifier(req.user, car, req):
                        sent += 1
                except Exception as exc:  # отправка не должна ронять синк
                    logger.error("Не удалось отправить уведомление: %s", exc)
        req.last_checked_at = now
        req.save(update_fields=["last_checked_at"])
    return sent
