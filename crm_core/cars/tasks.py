from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_order_notification(order_id):
    """
    Отправка уведомления о новом заказе
    """
    from cars.models import Order

    try:
        order = Order.objects.get(id=order_id)
        logger.info(f"Отправка уведомления для заказа #{order_id}")

        # Здесь можно добавить отправку email или Telegram уведомления
        # send_mail(...)

        return f"Notification sent for order #{order_id}"
    except Order.DoesNotExist:
        logger.error(f"Заказ #{order_id} не найден")
        return None


@shared_task
def check_new_advertisements():
    """
    Проверка новых объявлений и отправка уведомлений подписчикам
    """
    from cars.models import Advertisement, SearchRequest
    from django.utils import timezone
    from datetime import timedelta

    try:
        # Получаем объявления за последний час
        one_hour_ago = timezone.now() - timedelta(hours=1)
        new_ads = Advertisement.objects.filter(publication_date__gte=one_hour_ago)

        for ad in new_ads:
            # Находим подходящие подписки
            subscriptions = SearchRequest.objects.filter(
                status=SearchRequest.Status.TRACKED,
                brand=ad.car.brand,
                model=ad.car.model
            )

            for sub in subscriptions:
                # Проверяем соответствие фильтрам
                if sub.year_min and ad.car.year < sub.year_min:
                    continue
                if sub.year_max and ad.car.year > sub.year_max:
                    continue
                if sub.price_min and ad.car_price < sub.price_min:
                    continue
                if sub.price_max and ad.car_price > sub.price_max:
                    continue

                # Отправляем уведомление
                logger.info(f"Уведомление пользователю {sub.user.username} о новом объявлении")
                # Здесь интеграция с Telegram Bot для отправки уведомления

        return f"Checked {new_ads.count()} new advertisements"
    except Exception as e:
        logger.error(f"Ошибка при проверке объявлений: {str(e)}")
        return None


@shared_task
def update_exchange_rates():
    """
    Обновление курсов валют (KRW -> RUB)
    """
    try:
        # Здесь можно интегрировать API курсов валют
        logger.info("Обновление курсов валют")
        return "Exchange rates updated"
    except Exception as e:
        logger.error(f"Ошибка обновления курсов: {str(e)}")
        return None
