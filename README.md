# CRM-система для импорта автомобилей из Кореи

## 🚀 Telegram Mini App интегрирован!

Проект теперь работает как полноценное Telegram Mini App с поддержкой:
- ✅ Telegram WebApp SDK
- ✅ Автоматическая тема (светлая/темная)
- ✅ MainButton и BackButton
- ✅ Тактильная обратная связь
- ✅ Получение данных пользователя

**Быстрый старт Mini App:** см. [MINIAPP_QUICKSTART.md](./MINIAPP_QUICKSTART.md)

## Структура проекта

```
crm_system/
├── crm_core/              # Backend (Python/Django)
│   ├── crm/              # Основное приложение
│   ├── bot/              # Telegram бот
│   └── manage.py
├── Frontend/             # React интерфейс (ИНТЕГРИРОВАНО)
│   ├── src/
│   │   ├── components/   # 11 React компонентов
│   │   ├── services/     # mockData.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── files/                # Оригинальные файлы (для справки)
├── requirements.txt
└── README.md

## Что было сделано

✅ Интеграция React интерфейса из папки `files` в проект
✅ Настройка TypeScript и Vite конфигурации
✅ Добавление зависимостей: lucide-react, motion, tailwindcss
✅ Копирование всех 11 компонентов интерфейса
✅ Настройка типов и сервисов данных
✅ Подключение Django REST API
✅ Интеграция с PostgreSQL
✅ Telegram Bot с async/sync исправлениями
✅ Docker контейнеризация
✅ **Telegram Mini App интеграция**
  - Telegram WebApp SDK
  - telegram.ts утилиты
  - MainButton интеграция
  - Тема и haptic feedback
✅ Создание документации

## Запуск Frontend

### Требования
- Node.js 18+ и npm (не установлены в текущей системе)

### Установка зависимостей
```bash
cd Frontend
npm install
```

### Запуск dev-сервера
```bash
npm run dev
```
Приложение будет доступно на http://localhost:3000

### Сборка для production
```bash
npm run build
```

## Компоненты интерфейса

### Для клиентов (Telegram Mini-App)
- **HomeScreen** - главный экран с заказами и подписками
- **MakesSelector** - выбор марки автомобиля
- **ModelsSelector** - выбор модели
- **FiltersScreen** - расширенные фильтры поиска
- **ListingsScreen** - каталог объявлений
- **CarDetailsScreen** - детальная карточка авто
- **OrderTrackerScreen** - отслеживание заказа с картой
- **CheckpointPhotoScreen** - просмотр фото чекпоинтов
- **SubscriptionsManager** - управление подписками

### Для менеджеров (CRM панель)
- **AdminCRM** - административная панель
- **TelegramSimulator** - симулятор бота для тестирования

## Технологический стек Frontend

- **React 19** + TypeScript
- **Vite 8** - сборщик и dev-сервер
- **Tailwind CSS 4** - стилизация
- **Lucide React** - иконки
- **Motion** - анимации
- **localStorage** - хранение данных (мок)

## Следующие шаги

1. **Установить Node.js и npm** в систему
2. **Установить зависимости**: `cd Frontend && npm install`
3. **Запустить dev-сервер**: `npm run dev`
4. **Интегрировать с Backend API** - заменить mockData на реальные API вызовы
5. **Подключить Telegram WebApp SDK** для настоящей работы в Telegram

## Интеграция с Backend

В файле `Frontend/src/services/mockData.ts` находятся моковые данные. Для подключения к реальному API:

1. Установить axios: `npm install axios`
2. Создать API клиент в `src/services/api.ts`
3. Заменить вызовы `getStoredData()` на запросы к Django API
4. Настроить CORS в Django для доступа с `localhost:3000`

Пример API endpoint'ов для интеграции:
- `GET /api/cars/` - список автомобилей
- `GET /api/orders/` - заказы пользователя
- `POST /api/orders/` - создание заказа
- `GET /api/subscriptions/` - подписки
- `POST /api/subscriptions/` - добавление подписки

## Запуск Backend (Python)

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd crm_core
python manage.py migrate
python manage.py seed_brands  # Заполнить БД брендами и моделями
python manage.py runserver
```

Backend будет доступен на http://localhost:8000

### Важно: Заполнение базы данных

Перед первым использованием необходимо заполнить базу данных брендами и моделями автомобилей:

```bash
cd crm_core
python manage.py seed_brands
```

Эта команда создаст в базе данных следующие бренды и модели:
- **BMW**: 1-series, 3-series, 5-series, X5, X7
- **Audi**: A3, A4, A6, Q5
- **Chevrolet**: Bolt, Captiva, Trailblazer
- **Ford**: Explorer, Mustang, Ranger
- **Geely**: Coolray, Monjaro, Tugella

Без этого шага подписки не будут работать!

## Docker Deployment

### Быстрый старт с Docker

1. **Скопируйте файл переменных окружения:**
```bash
cp .env.example .env
```

2. **Отредактируйте `.env` файл:**
   - Установите `TELEGRAM_BOT_TOKEN` (получите у [@BotFather](https://t.me/BotFather))
   - Измените `DJANGO_SECRET_KEY` на случайную строку
   - Укажите `TELEGRAM_WEBHOOK_URL` и `WEBAPP_URL` если используете webhook

3. **Запустите все сервисы:**
```bash
docker-compose up -d
```

4. **Проверьте статус:**
```bash
docker-compose ps
```

### Сервисы

После запуска будут доступны:
- **Frontend**: http://localhost (порт 80)
- **Backend API**: http://localhost:8000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Parser Service**: http://localhost:8001

### Управление контейнерами

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр логов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend

# Пересборка после изменений
docker-compose up -d --build

# Выполнить команду в контейнере
docker-compose exec backend python manage.py createsuperuser
```

### Структура Docker контейнеров

- **postgres** - PostgreSQL 16 база данных
- **redis** - Redis для кэширования и Celery
- **backend** - Django REST API + автозаполнение БД брендами
- **celery_worker** - Обработка фоновых задач
- **celery_beat** - Планировщик периодических задач
- **telegram_bot** - Telegram бот для уведомлений
- **frontend** - React приложение с Nginx
- **parser_service** - Сервис парсинга (заглушка)

**Важно**: При первом запуске backend автоматически выполнит:
- Миграции базы данных
- Заполнение брендами и моделями (`seed_brands`)
- Сбор статических файлов

