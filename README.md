# CRM-система для импорта автомобилей из Кореи

## Требования

| Компонент | Минимальная версия |
|---|---|
| Docker + Docker Compose | v2+ |
| Node.js (для локальной разработки Frontend) | 18+ |
| Python (для локальной разработки Backend) | 3.11 – 3.13 |
| Git | любая актуальная |

---

## 🐳 Развертывание через Docker (Рекомендуется)

Docker поднимает весь стек одной командой: Backend, Frontend, PostgreSQL, Redis, Celery, Nginx и Telegram-бота.

### Шаг 1. Клонирование репозитория

```bash
git clone <URL-репозитория>
cd crm_system
```

### Шаг 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Откройте файл `.env` и заполните обязательные переменные:

| Переменная | Обязательно | Описание |
|---|---|---|
| `DJANGO_SECRET_KEY` | ✅ | Любая случайная строка (секрет Django) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота от [@BotFather](https://t.me/BotFather) |
| `VITE_TELEGRAM_BOT_USERNAME` | ✅ | Username бота (без `@`) — нужен для авторизации |
| `POSTGRES_PASSWORD` | ✅ | Пароль PostgreSQL |
| `TELEGRAM_AUTH_DEV_BYPASS` | ❌ | `True` — отключить проверку подписи Telegram (только для dev!) |
| `KRW_RUB_RATE_FALLBACK` | ❌ | Запасной курс RUB/KRW (по умолчанию `0.065`) |

### Шаг 3. Сборка и запуск

```bash
docker compose up -d --build
```

При первом запуске backend автоматически:
- Применит миграции БД (`migrate`)
- Заполнит справочники марок и моделей (`seed_brands`)
- Соберёт статику (`collectstatic`)

### Шаг 4. Первичное наполнение данными

```bash
# Создать суперпользователя для админки
docker compose exec backend python manage.py createsuperuser

# Загрузить демо-автомобили (без обращения к сети)
docker compose exec backend python manage.py import_encar_fixtures
```

### Что поднимется

| Сервис | Адрес | Назначение |
|---|---|---|
| **Gateway (Nginx)** | http://localhost:8080 | Frontend + проксирование API |
| **Backend API** | http://localhost:8080/api/ | REST API |
| **Swagger UI** | http://localhost:8080/api/docs/ | Документация API |
| **Django Admin** | http://localhost:8080/admin/ | Админка менеджера |
| **PostgreSQL** | localhost:5432 | База данных |
| **Redis** | localhost:6379 | Брокер Celery |

Также запускаются контейнеры: `celery_worker`, `celery_beat` (периодическая синхронизация) и `telegram_bot`.

### Управление контейнерами

```bash
docker compose ps                 # статус всех сервисов
docker compose logs -f backend    # логи backend
docker compose logs -f celery_worker
docker compose down               # остановить всё
docker compose up -d --build      # пересобрать после изменений
```

---

## 🖥️ Запуск через браузер (локальная разработка)

Для разработки можно запустить Frontend и Backend по отдельности без Docker.

### Backend (Django)

#### 1. Создание виртуальной среды

```bash
# Из корня проекта
python -m venv .venv

# Активация (Windows PowerShell):
.venv\Scripts\Activate.ps1

# Активация (Windows CMD):
.venv\Scripts\activate.bat

# Активация (Linux / macOS):
source .venv/bin/activate
```

#### 2. Установка зависимостей

```bash
# Облегчённый набор (без бота, работает на Python 3.14):
pip install Django djangorestframework djangorestframework-simplejwt \
    django-cors-headers django-filter drf-spectacular httpx celery redis \
    python-dotenv python-dateutil

# Полный набор (с ботом, требуется Python ≤ 3.13):
pip install -r crm_core/requirements.txt
```

#### 3. Настройка окружения

Для локальной разработки используется SQLite (без PostgreSQL).

```bash
cd crm_core
```

**Windows PowerShell:**
```powershell
$env:USE_SQLITE="1"
$env:TELEGRAM_AUTH_DEV_BYPASS="True"
```

**Linux / macOS:**
```bash
export USE_SQLITE=1
export TELEGRAM_AUTH_DEV_BYPASS=True
```

#### 4. Миграции и наполнение данными

```bash
python manage.py migrate
python manage.py seed_brands            # заполнить марки и модели
python manage.py import_encar_fixtures  # демо-автомобили
python manage.py createsuperuser        # суперпользователь для админки
```

#### 5. Запуск dev-сервера

```bash
python manage.py runserver
```

Backend будет доступен:
- **API:** http://localhost:8000/api/
- **Swagger:** http://localhost:8000/api/docs/
- **Админка:** http://localhost:8000/admin/

---

### Frontend (React + Vite)

#### 1. Установка зависимостей

```bash
cd Frontend
npm install
```

#### 2. Настройка окружения

Создайте файл `Frontend/.env` (или отредактируйте существующий):

```env
VITE_API_URL=http://localhost:8000/api
```

#### 3. Запуск dev-сервера

```bash
npm run dev
```

Frontend будет доступен на **http://localhost:3000**.

> **Примечание:** Frontend работает как обычное SPA в браузере. Telegram WebApp SDK подключён, но при открытии вне Telegram его функции (кнопки, тема, haptic feedback) будут недоступны — приложение корректно это обрабатывает и продолжит работу.

---

## 📱 Запуск через Telegram Mini App

Для работы в качестве Telegram Mini App требуется, чтобы приложение было доступно по **HTTPS URL**. Telegram не поддерживает `http://` и `localhost`.

### Способ 1. Туннель для разработки (ngrok / localtunnel / cloudflare)

Это самый быстрый способ проверить Mini App без деплоя на сервер.

#### 1. Запустите проект

Запустите через Docker (см. выше) — приложение будет на `http://localhost:8080`, или запустите Frontend локально на `http://localhost:3000`.

#### 2. Создайте HTTPS-туннель

**Вариант A — ngrok:**
```bash
# Для Docker (всё через gateway):
ngrok http 8080

# Для локальной разработки (только Frontend):
ngrok http 3000
```

**Вариант B — localtunnel:**
```bash
npx localtunnel --port 8080
```

**Вариант C — Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:8080
```

После запуска вы получите публичный HTTPS URL, например:
```
https://abc123.ngrok-free.app
```

#### 3. Настройте бота через @BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Выберите вашего бота → **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. Укажите HTTPS URL из шага 2 (например: `https://abc123.ngrok-free.app`)
4. Или настройте через команды:
   ```
   /mybots → Ваш бот → Bot Settings → Menu Button → Enter URL
   ```

#### 4. Обновите переменные окружения

Если используете Docker, обновите `.env`:
```env
VITE_API_URL=https://abc123.ngrok-free.app/api
WEBAPP_URL=https://abc123.ngrok-free.app
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080,https://abc123.ngrok-free.app
```

Если запускаете локально, обновите `Frontend/.env`:
```env
VITE_API_URL=https://abc123.ngrok-free.app/api
```

И добавьте URL в `CORS_ALLOWED_ORIGINS` вашего Backend `.env`.

#### 5. Откройте Mini App в Telegram

- Перейдите к вашему боту в Telegram
- Нажмите кнопку **Menu** (слева от поля ввода) — откроется Mini App
- Или отправьте `/start` — бот покажет кнопку «📱 Открыть Mini App»

---

### Способ 2. Деплой на сервер (Production)

Для полноценного развертывания в production.

#### 1. Подготовьте сервер

- VPS/VDS с Docker и Docker Compose
- Домен, привязанный к IP сервера
- SSL-сертификат (Let's Encrypt / Certbot)

#### 2. Клонируйте и настройте проект на сервере

```bash
git clone <URL-репозитория>
cd crm_system
cp .env.example .env
```

Отредактируйте `.env`:
```env
DEBUG=False
DJANGO_SECRET_KEY=<сгенерируйте-надёжный-ключ>
TELEGRAM_BOT_TOKEN=<ваш-токен>
VITE_API_URL=https://your-domain.com/api
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
WEBAPP_URL=https://your-domain.com
```

#### 3. Настройте SSL (Nginx + Let's Encrypt)

Добавьте SSL в `gateway/nginx.conf` или используйте отдельный Nginx / Traefik перед Docker.

Пример с Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 4. Запустите

```bash
docker compose up -d --build
```

#### 5. Зарегистрируйте Mini App в BotFather

1. [@BotFather](https://t.me/BotFather) → `/mybots` → выберите бота
2. **Bot Settings → Menu Button → Configure Menu Button**
3. Введите URL: `https://your-domain.com`

Теперь при нажатии кнопки Menu в чате с ботом будет открываться ваше Mini App.

---

## API Endpoints (Основные)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/telegram/` | Авторизация по `initData` → JWT |
| GET | `/api/cars/` | Каталог (фильтры: brand, model, year_min/max, price_min/max, mileage_min/max, fuel_type, color…) |
| GET | `/api/cars/{id}/` | Карточка авто (цена won/rub, фото, опции) |
| GET | `/api/cars/filters/` | Доступные значения фильтров для UI |
| GET/POST/PATCH/DELETE | `/api/search-requests/` | Подписки на фильтры |
| GET/POST | `/api/orders/` | Заявки (бронь), создаёт клиент |
| POST | `/api/orders/{id}/update_status/` | Смена статуса (менеджер) |
| GET | `/api/orders/{id}/history/` | Таймлайн статусов с фото |
| GET/POST | `/api/search-profiles/` | Профили сбора Encar (менеджер) |
| POST | `/api/search-profiles/{id}/run/` | Запустить синхронизацию профиля |

---

## Как работает сбор и уведомления

1. Менеджер создаёт **Профиль сбора** (марка + группа модели) в админке.
2. Celery-задача `sync_encar_profile` тянет список с Encar, нормализует и сохраняет авто (дедуп по `source+external_id`), деактивирует пропавшие, дозагружает детали.
3. Для новых авто запускается матчинг подписок: подходящие — **сразу отправляются пользователю в Telegram** (без хранения в БД, дедуп по watermark).
4. `celery_beat` запускает синхронизацию всех активных профилей каждые 30 минут.

---

## Переменные окружения (Полный список)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev-ключ | Секрет Django |
| `DEBUG` | `True` | Режим отладки |
| `ALLOWED_HOSTS` | `localhost,...` | Допустимые хосты |
| `TELEGRAM_BOT_TOKEN` | — | Токен бота (уведомления + авторизация) |
| `TELEGRAM_AUTH_DEV_BYPASS` | `False` | Вход без проверки подписи (только dev!) |
| `TELEGRAM_AUTH_TTL` | `86400` | Время жизни initData (секунды) |
| `WEBAPP_URL` | — | URL Mini App (для кнопки в боте) |
| `VITE_API_URL` | `http://localhost:8080/api` | URL API для Frontend |
| `VITE_TELEGRAM_BOT_USERNAME` | — | Username бота (для авторизации) |
| `KRW_RUB_RATE_FALLBACK` | `0.065` | Запасной курс RUB за 1 KRW |
| `ENCAR_BASE_URL` | `https://api.encar.com` | Базовый URL Encar |
| `ENCAR_IMAGE_BASE` | `https://ci.encar.com` | CDN для фото авто |
| `ENCAR_REQUEST_DELAY` | `1.0` | Пауза между запросами к Encar (сек) |
| `USE_SQLITE` | — | `1` = SQLite вместо Postgres (локально) |
| `POSTGRES_DB` | `crm_db` | Имя базы данных |
| `POSTGRES_USER` | `crm_user` | Пользователь БД |
| `POSTGRES_PASSWORD` | `crm_password` | Пароль БД |
| `CORS_ALLOWED_ORIGINS` | `localhost:5173,8080` | Разрешённые CORS-источники |

---

## Troubleshooting

| Проблема | Решение |
|---|---|
| **401 на `/api/...`** | Нужен JWT. Сначала `POST /api/auth/telegram/` с `initData`. Для dev без бота — `TELEGRAM_AUTH_DEV_BYPASS=True` |
| **Пустой каталог** | Выполните `import_encar_fixtures` (демо) или запустите синхронизацию профиля |
| **Mini App не открывается** | Проверьте, что URL в BotFather — HTTPS. `http://` и `localhost` Telegram не поддерживает |
| **Уведомления не приходят** | Проверьте `TELEGRAM_BOT_TOKEN` и что у пользователя заполнен `telegram_id` |
| **CORS ошибки** | Добавьте URL фронтенда в `CORS_ALLOWED_ORIGINS` в `.env` |
| **`aiogram` не ставится на Python 3.14** | Это нормально. Для backend бот не нужен — ставьте облегчённый набор или используйте Docker |
| **Frontend не видит API** | Проверьте `VITE_API_URL` в `Frontend/.env`. При использовании ngrok — укажите HTTPS-адрес |
