import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from cars.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)


def verify_telegram_data(init_data: str, bot_token: str, ttl: int = 86400) -> dict:
    """
    Верифицирует данные от Telegram WebApp (HMAC-SHA256) и проверяет свежесть
    initData (auth_date в пределах ttl секунд).
    """
    try:
        # Парсим init_data
        parsed_data = parse_qs(init_data)

        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            return None
        if not bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN не задан — проверка initData невозможна")
            return None

        # Создаем строку для проверки
        data_check_arr = []
        for key, value in parsed_data.items():
            if key != 'hash':
                data_check_arr.append(f"{key}={value[0]}")

        data_check_arr.sort()
        data_check_string = '\n'.join(data_check_arr)

        # Создаем секретный ключ
        secret_key = hmac.new(
            "WebAppData".encode(),
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Проверяем hash (защита от подмены)
        if not hmac.compare_digest(calculated_hash, received_hash):
            logger.warning("Telegram data verification failed: hash mismatch")
            return None

        # Проверяем свежесть initData (защита от повторного использования)
        auth_date = parsed_data.get('auth_date', [None])[0]
        if auth_date:
            try:
                if ttl and (time.time() - int(auth_date)) > ttl:
                    logger.warning("Telegram initData истёк (auth_date слишком старый)")
                    return None
            except (TypeError, ValueError):
                pass

        # Парсим данные пользователя
        user_data = parsed_data.get('user', [None])[0]
        if user_data:
            return json.loads(user_data)

        return None

    except Exception as e:
        logger.error(f"Error verifying Telegram data: {e}", exc_info=True)
        return None


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def telegram_auth(request):
    """
    Аутентификация пользователя через Telegram WebApp initData
    Возвращает JWT токены
    """
    init_data = request.data.get('initData')

    if not init_data:
        return Response(
            {'error': 'initData is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Верифицируем данные
    user_data = verify_telegram_data(
        init_data, settings.TELEGRAM_BOT_TOKEN,
        ttl=getattr(settings, 'TELEGRAM_AUTH_TTL', 86400),
    )

    if not user_data:
        # Обход проверки разрешён ТОЛЬКО явным флагом для локальной разработки
        if getattr(settings, 'TELEGRAM_AUTH_DEV_BYPASS', False):
            logger.warning("TELEGRAM_AUTH_DEV_BYPASS включён — пропуск проверки подписи")
            try:
                parsed = parse_qs(init_data)
                user_json = parsed.get('user', [None])[0]
                if user_json:
                    user_data = json.loads(user_json)
            except Exception:
                pass

        if not user_data:
            return Response(
                {'error': 'Invalid Telegram data'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    # Получаем или создаем пользователя
    telegram_id = user_data.get('id')
    first_name = user_data.get('first_name', '')
    last_name = user_data.get('last_name', '')
    username = user_data.get('username', '')

    if not telegram_id:
        return Response(
            {'error': 'Telegram ID not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Ищем пользователя по telegram_id
        user = User.objects.get(telegram_id=telegram_id)
        logger.info(f"Found existing user by telegram_id: {user.username}")
    except User.DoesNotExist:
        # Если не нашли по telegram_id, пытаемся найти по username
        if username:
            try:
                user = User.objects.get(username=username)
                # Обновляем telegram_id у существующего пользователя
                user.telegram_id = telegram_id
                user.save()
                logger.info(f"Found existing user by username and updated telegram_id: {user.username}")
            except User.DoesNotExist:
                # Создаем нового пользователя
                user = User.objects.create(
                    username=username,
                    telegram_id=telegram_id,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.CLIENT
                )
                logger.info(f"Created new user: {user.username}")
        else:
            # Нет username, создаем с автогенерированным
            username_to_use = f'tg_{telegram_id}'
            user = User.objects.create(
                username=username_to_use,
                telegram_id=telegram_id,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.CLIENT
            )
            logger.info(f"Created new user with generated username: {user.username}")

    # Обновляем данные пользователя
    user.first_name = first_name
    user.last_name = last_name
    if username and user.username.startswith('tg_'):
        user.username = username
    user.save()

    # Генерируем JWT токены
    refresh = RefreshToken.for_user(user)

    logger.info(f"User authenticated: {user.username} (telegram_id: {telegram_id})")

    return Response({
        'success': True,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'telegram_id': user.telegram_id,
            'role': user.role,
        }
    })
