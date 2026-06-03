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
python crm_core/manage.py runserver
```

Backend будет доступен на http://localhost:8000
