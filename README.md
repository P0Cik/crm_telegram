# CRM-система для импорта автомобилей из Кореи

## 🚀 Telegram Mini App интегрирован!

Проект работает как полноценное Telegram Mini App с поддержкой:
- ✅ Telegram WebApp SDK
- ✅ Автоматическая тема (светлая/темная)
- ✅ MainButton и BackButton
- ✅ Тактильная обратная связь
- ✅ Получение данных пользователя

## Структура проекта

```text
crm_system/
├── crm_core/              # Backend (Python/Django)
│   ├── crm/              # Основное приложение
│   ├── bot/              # Telegram бот
│   ├── cars/             # Логика работы с автомобилями и Encar
│   └── manage.py
├── Frontend/             # React интерфейс (Telegram Mini App)
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── services/     # API и сервисы данных (api.ts, auth.ts)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Что было сделано (Последние обновления)

✅ **База данных и модели:** Слияние сущностей `Car` и `Advertisement` в единую унифицированную модель.
✅ **Интеграция с Encar:** Реализована логика синхронизации и парсинга данных через `encar/sync.py`.
✅ **Подключение Frontend к Backend:** Замена моковых данных на реальные API вызовы (`/api/cars/`, `/api/brands/`).
✅ **Динамические фильтры:** Frontend теперь динамически загружает доступные марки и модели напрямую из базы данных.
✅ **Поиск и фильтрация:** Полноценно работает поиск автомобилей с передачей параметров (марка, модель, цена, год, пробег) на Backend через `FiltersScreen`.
✅ **Telegram Bot:** Обновлена система подписок и уведомлений под новую структуру данных.
✅ **Docker:** Настроена полная контейнеризация.

## Запуск проекта

### Быстрый старт с Docker (Рекомендуется)

1. **Скопируйте файл переменных окружения:**
```bash
cp .env.example .env
```

2. **Отредактируйте `.env` файл:**
   - Установите `TELEGRAM_BOT_TOKEN` (получите у @BotFather)
   - Настройте `DJANGO_SECRET_KEY`

3. **Запустите все сервисы:**
```bash
docker-compose up -d --build
```

**Доступные сервисы после запуска:**
- **Frontend (Mini App)**: http://localhost (порт 80)
- **Backend API**: http://localhost:8000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

При первом запуске backend автоматически выполнит миграции и заполнение базы тестовыми брендами и моделями (`seed_brands`).

### Локальный запуск (Разработка)

#### Frontend
```bash
cd Frontend
npm install
npm run dev
```
Приложение будет доступно на http://localhost:3000

#### Backend (Python)
```bash
cd crm_core
python -m venv venv
venv\Scripts\activate  # Для Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_brands  # Обязательно для заполнения БД марками!
python manage.py runserver
```
API будет доступно на http://localhost:8000

## API Endpoints (Основные)

- `GET /api/cars/` - Поиск и список автомобилей (поддерживает параметры `make`, `model`, `min_price`, `max_price`, `year_from`, `year_to` и др.)
- `GET /api/brands/` - Список доступных марок и моделей
- `GET /api/orders/` - Заказы пользователя
- `POST /api/orders/` - Создание заказа
- `GET /api/subscriptions/` - Подписки
- `POST /api/subscriptions/` - Добавление подписки
