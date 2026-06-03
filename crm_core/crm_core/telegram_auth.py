from django.utils.deprecation import MiddlewareMixin
from cars.models import User
import logging

logger = logging.getLogger(__name__)


class TelegramAuthMiddleware(MiddlewareMixin):
    """
    Middleware для автоматической аутентификации пользователей через Telegram ID
    """

    def process_request(self, request):
        # Получаем Telegram ID из заголовка
        telegram_user_id = request.headers.get('X-Telegram-User-Id')

        logger.info(f"TelegramAuthMiddleware: Telegram User ID from header: {telegram_user_id}")
        logger.info(f"TelegramAuthMiddleware: All headers: {dict(request.headers)}")

        if telegram_user_id:
            try:
                telegram_user_id = int(telegram_user_id)

                # Пытаемся найти или создать пользователя по Telegram ID
                telegram_first_name = request.headers.get('X-Telegram-First-Name', '')
                telegram_last_name = request.headers.get('X-Telegram-Last-Name', '')
                telegram_username = request.headers.get('X-Telegram-Username', '')

                logger.info(f"TelegramAuthMiddleware: Creating/fetching user with Telegram ID: {telegram_user_id}")

                # Сначала пытаемся найти пользователя по telegram_id
                try:
                    user = User.objects.get(telegram_id=telegram_user_id)
                    logger.info(f"Found existing user by telegram_id: {user.username}")
                except User.DoesNotExist:
                    # Если не нашли по telegram_id, пытаемся найти по username и обновить telegram_id
                    if telegram_username:
                        try:
                            user = User.objects.get(username=telegram_username)
                            user.telegram_id = telegram_user_id
                            user.save()
                            logger.info(f"Found existing user by username and updated telegram_id: {user.username}")
                        except User.DoesNotExist:
                            # Создаём нового пользователя
                            user = User.objects.create(
                                username=telegram_username or f'tg_{telegram_user_id}',
                                telegram_id=telegram_user_id,
                                first_name=telegram_first_name,
                                last_name=telegram_last_name,
                                role=User.Role.CLIENT
                            )
                            logger.info(f"Created new user: {user.username}")
                    else:
                        # Нет username, создаём с telegram_id
                        user = User.objects.create(
                            username=f'tg_{telegram_user_id}',
                            telegram_id=telegram_user_id,
                            first_name=telegram_first_name,
                            last_name=telegram_last_name,
                            role=User.Role.CLIENT
                        )
                        logger.info(f"Created new user with generated username: {user.username}")

                # Обновляем данные пользователя, если они изменились
                updated = False
                if user.first_name != telegram_first_name:
                    user.first_name = telegram_first_name
                    updated = True
                if user.last_name != telegram_last_name:
                    user.last_name = telegram_last_name
                    updated = True
                if updated:
                    user.save()
                    logger.info(f"Updated user data for Telegram ID: {telegram_user_id}")

                # Устанавливаем пользователя в request
                request.user = user
                logger.info(f"Authenticated user via Telegram ID: {telegram_user_id}, username: {user.username}, user.is_authenticated: {user.is_authenticated}")

            except ValueError:
                logger.warning(f"Invalid Telegram User ID: {telegram_user_id}")
            except Exception as e:
                logger.error(f"Error in TelegramAuthMiddleware: {e}", exc_info=True)
        else:
            logger.warning("No Telegram User ID found in headers")

        return None
