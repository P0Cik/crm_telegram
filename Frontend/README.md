# Korea CRM & Mini-App Frontend

## Описание
Интегрированный React интерфейс для CRM-системы импорта автомобилей из Южной Кореи. Включает Telegram Mini-App для клиентов и административную панель для менеджеров.

## Структура проекта

```
Frontend/
├── src/
│   ├── components/         # Все React компоненты
│   │   ├── AdminCRM.tsx           # Панель управления менеджера
│   │   ├── CarDetailsScreen.tsx   # Детальная карточка автомобиля
│   │   ├── CheckpointPhotoScreen.tsx  # Просмотр фото чекпоинтов
│   │   ├── FiltersScreen.tsx      # Экран фильтров поиска
│   │   ├── HomeScreen.tsx         # Главный экран клиента
│   │   ├── ListingsScreen.tsx     # Список объявлений
│   │   ├── MakesSelector.tsx      # Выбор марки авто
│   │   ├── ModelsSelector.tsx     # Выбор модели авто
│   │   ├── OrderTrackerScreen.tsx # Трекинг заказа
│   │   ├── SubscriptionsManager.tsx   # Управление подписками
│   │   └── TelegramSimulator.tsx  # Симулятор Telegram-бота
│   ├── services/
│   │   └── mockData.ts     # Данные и localStorage API
│   ├── App.tsx             # Главный компонент приложения
│   ├── main.tsx            # Точка входа
│   ├── types.ts            # TypeScript типы
│   └── index.css           # Tailwind CSS стили
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Установка и запуск

### Требования
- Node.js 18+ и npm

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

## Основные функции

### Для клиентов (Mini-App)
- Поиск автомобилей по марке, модели и параметрам
- Просмотр каталога с фильтрацией
- Оформление заказов
- Отслеживание статуса доставки с фото-отчетами
- Управление подписками на уведомления

### Для менеджеров (CRM)
- Добавление новых автомобилей в каталог
- Управление заказами и статусами
- Обновление чекпоинтов доставки
- Просмотр подписок клиентов

## Технологии
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Lucide React (иконки)
- Motion (анимации)
- localStorage для хранения данных

## Интеграция с backend
Текущая версия использует mockData и localStorage. Для интеграции с реальным API необходимо:
1. Заменить функции в `src/services/mockData.ts` на API-вызовы
2. Настроить axios или fetch для работы с backend
3. Добавить обработку ошибок и загрузки
