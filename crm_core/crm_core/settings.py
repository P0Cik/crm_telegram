import os
from pathlib import Path
from os import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

AUTH_USER_MODEL = 'cars.User'


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = environ.get('DJANGO_SECRET_KEY', 'django-insecure-x4g2^=fnt2)najph0oqqjrm(*55ued##dix68hy1e^ez751*1b')

# SECURITY WARNING: don't run with debug turned on in production!
# Безопасный дефолт — выключено; локальная разработка включает DEBUG=True в .env.
DEBUG = environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Добавляем поддержку Cloudflare Tunnel
if environ.get('CLOUDFLARE_TUNNEL'):
    ALLOWED_HOSTS.append(environ.get('CLOUDFLARE_TUNNEL'))

# Разрешаем все *.trycloudflare.com домены для разработки
if DEBUG:
    ALLOWED_HOSTS.append('.trycloudflare.com')

# CSRF settings для Cloudflare Tunnel
CSRF_TRUSTED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

# Добавляем Cloudflare Tunnel домены
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        'https://*.trycloudflare.com',
    ])

# Если указан конкретный tunnel
if environ.get('CLOUDFLARE_TUNNEL'):
    CSRF_TRUSTED_ORIGINS.append(f"https://{environ.get('CLOUDFLARE_TUNNEL')}")
    CSRF_TRUSTED_ORIGINS.append(f"http://{environ.get('CLOUDFLARE_TUNNEL')}")

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_filters',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'cars',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'CRM импорта автомобилей из Кореи — API',
    'DESCRIPTION': 'Backend: каталог Encar, подписки, заявки, статусы доставки.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=int(environ.get('JWT_ACCESS_HOURS', '24'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'crm_core.urls'

# CORS settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:80',
    'http://127.0.0.1:80',
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # В режиме DEBUG разрешаем все origins

# Разрешаем кастомные заголовки для Telegram аутентификации
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-telegram-user-id',
    'x-telegram-first-name',
    'x-telegram-last-name',
    'x-telegram-username',
    'x-telegram-init-data',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'crm_core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# Локально (без Postgres) можно использовать SQLite: USE_SQLITE=1
if environ.get('USE_SQLITE') == '1':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': environ.get('POSTGRES_DB', 'crm_db'),
            'USER': environ.get('POSTGRES_USER', 'crm_user'),
            'PASSWORD': environ.get('POSTGRES_PASSWORD', 'crm_password'),
            'HOST': environ.get('POSTGRES_HOST', 'localhost'),
            'PORT': environ.get('POSTGRES_PORT', '5432'),
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Europe/Moscow'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'backend_static')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Celery Configuration
CELERY_BROKER_URL = environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Telegram Bot
TELEGRAM_BOT_TOKEN = environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_WEBHOOK_URL = environ.get('TELEGRAM_WEBHOOK_URL', '')
# Разрешить вход без проверки подписи initData (ТОЛЬКО для локальной разработки!)
# Безопасный дефолт — выключено.
TELEGRAM_AUTH_DEV_BYPASS = environ.get('TELEGRAM_AUTH_DEV_BYPASS', 'False') == 'True'
# Время жизни initData (сек) для защиты от повторного использования
TELEGRAM_AUTH_TTL = int(environ.get('TELEGRAM_AUTH_TTL', '86400'))

# --- Источник данных Encar ---
ENCAR_BASE_URL = environ.get('ENCAR_BASE_URL', 'https://api.encar.com')
ENCAR_IMAGE_BASE = environ.get('ENCAR_IMAGE_BASE', 'https://ci.encar.com')
ENCAR_REQUEST_DELAY = float(environ.get('ENCAR_REQUEST_DELAY', '1.0'))

# --- Курс валют ---
# Запасной курс RUB за 1 KRW (вон): используется, только если в БД ещё нет курса.
# Актуальный курс хранится в модели ExchangeRate и обновляется update_exchange_rates.
KRW_RUB_RATE_FALLBACK = environ.get('KRW_RUB_RATE_FALLBACK', '0.065')

# --- Кэш (курс валют и пр.) ---
_REDIS_URL = environ.get('REDIS_URL', '')
if _REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _REDIS_URL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

