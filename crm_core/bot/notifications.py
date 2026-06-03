"""
Модуль для отправки уведомлений пользователям через Telegram бота
"""
import os
import asyncio
import logging
from aiogram import Bot
from django.conf import settings
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class TelegramNotifier:
    """Класс для отправки уведомлений через Telegram"""

    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot = Bot(token=self.bot_token) if self.bot_token else None

    async def send_message(self, user_id: int, text: str, **kwargs):
        """Отправить сообщение пользователю"""
        if not self.bot:
            logger.warning("Telegram bot token not configured")
            return False

        try:
            await self.bot.send_message(chat_id=user_id, text=text, **kwargs)
            logger.info(f"Message sent to user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error sending message to user {user_id}: {e}")
            return False

    async def notify_new_order(self, user, order):
        """Уведомление о новом заказе"""
        car = order.car
        brand_name = car.brand.name if car.brand else "Неизвестно"
        model_name = car.model.name if car.model else "Неизвестно"

        text = (
            f"✅ Ваш заказ #{order.id} оформлен!\n\n"
            f"🚗 Автомобиль: {brand_name} {model_name} ({car.year})\n"
            f"💰 Сумма: {order.total_price} ₽\n"
            f"📦 Статус: В обработке\n\n"
            f"Мы свяжемся с вами в ближайшее время для уточнения деталей."
        )

        # Получаем telegram_id из username (предполагается что username = telegram_id)
        try:
            telegram_id = int(user.username) if user.username.isdigit() else None
            if telegram_id:
                await self.send_message(telegram_id, text)
        except Exception as e:
            logger.error(f"Error getting telegram_id for user {user.id}: {e}")

    async def notify_order_status_update(self, user, order, new_status):
        """Уведомление об изменении статуса заказа"""
        status_names = {
            'PROCESSING': '📋 В обработке',
            'WAREHOUSE_KR': '📦 На складе в Корее',
            'IN_TRANSIT_BORDER': '🚢 В пути (граница)',
            'AT_BORDER': '🛃 На границе',
            'WAREHOUSE_RU': '📦 На складе в РФ',
            'IN_TRANSIT_RU': '🚗 В пути (РФ)',
            'DELIVERED': '✅ Доставлен',
        }

        text = (
            f"📢 Обновление по заказу #{order.id}\n\n"
            f"Новый статус: {status_names.get(new_status, new_status)}\n\n"
            f"Вы можете отследить заказ в Mini App."
        )

        try:
            telegram_id = int(user.username) if user.username.isdigit() else None
            if telegram_id:
                await self.send_message(telegram_id, text)
        except Exception as e:
            logger.error(f"Error getting telegram_id for user {user.id}: {e}")

    async def notify_new_subscription(self, user, search_request):
        """Уведомление о новой подписке"""
        brand_name = search_request.brand.name if search_request.brand else "Любая марка"
        model_name = search_request.model.name if search_request.model else "Любая модель"

        text = (
            f"🔔 Подписка создана!\n\n"
            f"🚗 Марка: {brand_name}\n"
            f"📝 Модель: {model_name}\n"
        )

        if search_request.year_min or search_request.year_max:
            text += f"📅 Год: {search_request.year_min or 'любой'} - {search_request.year_max or 'любой'}\n"

        text += "\nВы получите уведомление, когда появится подходящий автомобиль!"

        try:
            telegram_id = int(user.username) if user.username.isdigit() else None
            if telegram_id:
                await self.send_message(telegram_id, text)
        except Exception as e:
            logger.error(f"Error getting telegram_id for user {user.id}: {e}")

    async def notify_matching_car(self, user, car, search_request):
        """Уведомление о появлении подходящего автомобиля"""
        brand_name = car.brand.name if car.brand else "Неизвестно"
        model_name = car.model.name if car.model else "Неизвестно"

        text = (
            f"🎉 Найден автомобиль по вашей подписке!\n\n"
            f"🚗 {brand_name} {model_name} ({car.year})\n"
            f"⚡ {car.engine_power or 0} л.с. | {car.engine_volume or 0}л\n"
            f"⛽ {car.get_fuel_type_display()}\n"
            f"🎨 {car.color or 'не указан'}\n"
            f"📍 {car.seller_country}\n\n"
            f"Откройте Mini App для просмотра деталей!"
        )

        try:
            telegram_id = int(user.username) if user.username.isdigit() else None
            if telegram_id:
                await self.send_message(telegram_id, text)
        except Exception as e:
            logger.error(f"Error getting telegram_id for user {user.id}: {e}")

    def close(self):
        """Закрыть соединение с ботом"""
        if self.bot:
            asyncio.create_task(self.bot.session.close())


# Глобальный экземпляр notifier
notifier = TelegramNotifier()


# Синхронные обертки для использования в Django views/signals
def send_order_notification(user, order):
    """Синхронная обертка для отправки уведомления о заказе"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(notifier.notify_new_order(user, order))


def send_order_status_notification(user, order, new_status):
    """Синхронная обертка для отправки уведомления об изменении статуса"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(notifier.notify_order_status_update(user, order, new_status))


def send_subscription_notification(user, search_request):
    """Синхронная обертка для отправки уведомления о подписке"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(notifier.notify_new_subscription(user, search_request))


def send_matching_car_notification(user, car, search_request):
    """Синхронная обертка для отправки уведомления о найденном авто"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(notifier.notify_matching_car(user, car, search_request))
