"""
Отправка уведомлений пользователям через Telegram Bot API.

Синхронная реализация на httpx — безопасна для вызова из Celery-задач и Django
views (без событийного цикла asyncio). Сообщения адресуются по ``user.telegram_id``.
Уведомления не сохраняются в БД — отправляются напрямую.
"""
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.telegram.org"


def _enabled() -> bool:
    return bool(getattr(settings, "TELEGRAM_BOT_TOKEN", ""))


def _chat_id(user):
    """Возвращает telegram_id пользователя (или None)."""
    return getattr(user, "telegram_id", None)


def _post(method: str, payload: dict) -> bool:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN не задан — уведомление пропущено")
        return False
    url = f"{API_BASE}/bot{token}/{method}"
    try:
        resp = httpx.post(url, json=payload, timeout=15.0)
        if resp.status_code != 200:
            logger.error("Telegram %s -> %s: %s", method, resp.status_code, resp.text[:300])
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("Ошибка отправки в Telegram (%s): %s", method, exc)
        return False


def send_message(user, text: str, parse_mode: str = "HTML") -> bool:
    chat_id = _chat_id(user)
    if not chat_id:
        logger.warning("У пользователя %s нет telegram_id — пропуск", getattr(user, "id", "?"))
        return False
    return _post("sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": parse_mode})


def send_photo(user, photo_url: str, caption: str, parse_mode: str = "HTML") -> bool:
    chat_id = _chat_id(user)
    if not chat_id:
        logger.warning("У пользователя %s нет telegram_id — пропуск", getattr(user, "id", "?"))
        return False
    return _post("sendPhoto", {
        "chat_id": chat_id, "photo": photo_url, "caption": caption, "parse_mode": parse_mode,
    })


# --- Готовые шаблоны уведомлений --------------------------------------------
def _car_title(car):
    brand = car.brand.display_name() if car.brand else "Авто"
    model = car.model.display_name() if car.model else (
        car.model_group.display_name() if car.model_group else "")
    return f"{brand} {model} ({car.year})".strip()


def send_order_notification(user, order):
    """Уведомление о новом заказе."""
    text = (
        f"✅ Ваш заказ №{order.id} оформлен!\n\n"
        f"🚗 {_car_title(order.car)}\n"
        f"💰 {order.total_price:,.0f} ₽\n"
        f"📦 Статус: {order.get_status_display()}\n\n"
        f"Мы свяжемся с вами в ближайшее время."
    )
    return send_message(user, text)


def send_order_status_notification(user, order, new_status=None):
    """Уведомление об изменении статуса заказа."""
    text = (
        f"📢 Обновление по заказу №{order.id}\n\n"
        f"🚗 {_car_title(order.car)}\n"
        f"Новый статус: {order.get_status_display()}\n\n"
        f"Подробности — в Mini App."
    )
    return send_message(user, text)


def send_subscription_notification(user, search_request):
    """Подтверждение создания подписки."""
    brand = search_request.brand.display_name() if search_request.brand else "Любая марка"
    model = (search_request.model.display_name() if search_request.model else
             (search_request.model_group.display_name() if search_request.model_group else "Любая модель"))
    text = (
        f"🔔 Подписка создана!\n\n"
        f"🚗 Марка: {brand}\n"
        f"📝 Модель: {model}\n"
    )
    if search_request.year_min or search_request.year_max:
        text += f"📅 Год: {search_request.year_min or 'любой'} – {search_request.year_max or 'любой'}\n"
    text += "\nМы сообщим, когда появится подходящий автомобиль!"
    return send_message(user, text)


def send_matching_car_notification(user, car, search_request=None):
    """Уведомление о появлении подходящего под подписку автомобиля."""
    price = ""
    price_rub = car.price_rub()
    if price_rub:
        price = f"💰 {price_rub:,.0f} ₽\n"
    if car.mileage:
        price += f"📏 {car.mileage:,} км\n"
    caption = (
        f"🎉 Новое авто по вашей подписке!\n\n"
        f"🚗 <b>{_car_title(car)}</b>\n"
        f"{car.badge}\n"
        f"⛽ {car.get_fuel_type_display()}\n"
        f"{price}"
        f"📍 {car.region or 'Южная Корея'}\n\n"
        f"Откройте Mini App для деталей."
    )
    photo = car.photos.first()
    if photo:
        return send_photo(user, photo.url, caption)
    return send_message(user, caption)
