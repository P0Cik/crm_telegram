import os
import sys
import asyncio
import logging
from pathlib import Path

# Добавляем родительскую директорию в путь для импорта Django
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_core.settings')
import django
django.setup()

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton,
    WebAppInfo
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from asgiref.sync import sync_to_async

from cars.models import User, Order, SearchRequest, Car, Advertisement
from django.conf import settings

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота
bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# Состояния FSM
class RegistrationStates(StatesGroup):
    waiting_for_phone = State()
    waiting_for_name = State()


# Обертки для работы с БД
@sync_to_async
def get_or_create_user(telegram_id, username, first_name, last_name):
    """Получить или создать пользователя"""
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'first_name': first_name or "",
            'last_name': last_name or "",
            'role': User.Role.CLIENT
        }
    )
    return user, created

@sync_to_async
def get_user_by_username(username):
    """Получить пользователя по username"""
    return User.objects.filter(username=username).first()

@sync_to_async
def get_cars_list(limit=5):
    """Получить список автомобилей"""
    return list(Car.objects.select_related('brand', 'model').all()[:limit])

@sync_to_async
def get_user_orders(user):
    """Получить заказы пользователя"""
    return list(Order.objects.filter(user=user).select_related(
        'car', 'car__brand', 'car__model'
    ).order_by('-created_at')[:10])

@sync_to_async
def get_user_subscriptions(user):
    """Получить подписки пользователя"""
    return list(SearchRequest.objects.filter(
        user=user,
        status=SearchRequest.Status.TRACKED
    ).select_related('brand', 'model'))

@sync_to_async
def get_car_by_vin(vin):
    """Получить автомобиль по VIN"""
    return Car.objects.filter(vin=vin).first()

@sync_to_async
def create_order(user, car, price):
    """Создать заказ"""
    return Order.objects.create(
        user=user,
        car=car,
        total_price=price,
        status=Order.Status.PROCESSING
    )

@sync_to_async
def get_order_by_id(order_id):
    """Получить заказ по ID"""
    return Order.objects.select_related(
        'car', 'car__brand', 'car__model'
    ).filter(id=order_id).first()

@sync_to_async
def get_order_history(order):
    """Получить историю заказа"""
    return list(order.status_history.all()[:5])


# Клавиатуры
def get_main_keyboard(webapp_url=None):
    """Главное меню"""
    buttons = [
        [
            KeyboardButton(text="🚗 Каталог авто"),
            KeyboardButton(text="📦 Мои заказы")
        ],
        [
            KeyboardButton(text="🔔 Подписки"),
            KeyboardButton(text="👤 Профиль")
        ]
    ]

    # Добавляем кнопку Mini App если есть URL
    if webapp_url:
        buttons.append([
            KeyboardButton(text="📱 Открыть Mini App", web_app=WebAppInfo(url=webapp_url))
        ])

    keyboard = ReplyKeyboardMarkup(
        keyboard=buttons,
        resize_keyboard=True
    )
    return keyboard


def get_manager_keyboard():
    """Клавиатура для менеджера"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📋 Все заказы"),
                KeyboardButton(text="➕ Добавить авто")
            ],
            [
                KeyboardButton(text="📊 Статистика"),
                KeyboardButton(text="👥 Клиенты")
            ],
            [
                KeyboardButton(text="🔙 Вернуться")
            ]
        ],
        resize_keyboard=True
    )
    return keyboard


# Обработчики команд
@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    """Обработчик команды /start"""
    telegram_id = message.from_user.id
    username = message.from_user.username or f"user_{telegram_id}"

    # URL Mini App из настроек (или переменной окружения)
    webapp_url = os.getenv('WEBAPP_URL', None)

    try:
        # Проверяем, существует ли пользователь
        user, created = await get_or_create_user(
            telegram_id,
            username,
            message.from_user.first_name,
            message.from_user.last_name
        )

        if created:
            logger.info(f"Создан новый пользователь: {username}")

            welcome_text = (
                f"👋 Добро пожаловать, {message.from_user.first_name}!\n\n"
                "Я помогу вам найти и приобрести автомобиль из Южной Кореи.\n\n"
                "🚗 Большой выбор авто\n"
                "📦 Отслеживание доставки\n"
                "🔔 Уведомления о новых объявлениях\n"
            )

            if webapp_url:
                welcome_text += "\n📱 Нажмите кнопку ниже, чтобы открыть каталог в Mini App!\n"

            welcome_text += "\nВыберите действие:"

            await message.answer(
                welcome_text,
                reply_markup=get_main_keyboard(webapp_url)
            )
        else:
            # Пользователь уже существует
            if user.role == User.Role.MANAGER:
                keyboard = get_manager_keyboard()
            else:
                keyboard = get_main_keyboard(webapp_url)

            await message.answer(
                f"С возвращением, {user.first_name}! 👋\n\n"
                "Чем могу помочь?",
                reply_markup=keyboard
            )

    except Exception as e:
        logger.error(f"Ошибка в cmd_start: {e}")
        await message.answer(
            "Произошла ошибка при запуске бота. Попробуйте позже."
        )


@dp.message(F.text == "🚗 Каталог авто")
async def show_catalog(message: types.Message):
    """Показать каталог автомобилей"""
    try:
        # Получаем последние 5 автомобилей
        cars = await get_cars_list(5)

        if not cars:
            await message.answer(
                "К сожалению, сейчас нет доступных автомобилей.\n"
                "Создайте подписку, чтобы получать уведомления о новых поступлениях!"
            )
            return

        await message.answer(
            f"📋 Найдено автомобилей: {len(cars)}\n\n"
            "Вот последние поступления:"
        )

        for car in cars:
            brand_name = car.brand.name if car.brand else "Неизвестно"
            model_name = car.model.name if car.model else "Неизвестно"

            text = (
                f"🚗 *{brand_name} {model_name}* ({car.year})\n"
                f"⚡ {car.engine_power or 0} л.с. | {car.engine_volume or 0}л\n"
                f"⛽ {car.get_fuel_type_display()}\n"
                f"🎨 {car.color or 'не указан'}\n"
                f"📍 {car.seller_country}\n"
                f"VIN: `{car.vin}`"
            )

            # Кнопки для действий
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(text="📝 Заказать", callback_data=f"order_{car.vin}"),
                        InlineKeyboardButton(text="ℹ️ Подробнее", callback_data=f"details_{car.vin}")
                    ]
                ]
            )

            await message.answer(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Ошибка в show_catalog: {e}")
        await message.answer("Ошибка при загрузке каталога")


@dp.message(F.text == "📦 Мои заказы")
async def show_orders(message: types.Message):
    """Показать заказы пользователя"""
    try:
        username = message.from_user.username or f"user_{message.from_user.id}"
        user = await get_user_by_username(username)

        if not user:
            await message.answer("Пользователь не найден. Используйте /start для регистрации.")
            return

        orders = await get_user_orders(user)

        if not orders:
            await message.answer(
                "У вас пока нет заказов.\n"
                "Посмотрите каталог и сделайте первый заказ! 🚗"
            )
            return

        await message.answer(f"📦 Ваши заказы ({len(orders)}):")

        for order in orders:
            status_emoji = {
                'PROCESSING': '⏳',
                'WAREHOUSE_KR': '🏭',
                'IN_TRANSIT_BORDER': '🚚',
                'AT_BORDER': '🛃',
                'WAREHOUSE_RU': '📦',
                'IN_TRANSIT_RU': '🚛',
                'DELIVERED': '✅',
                'CANCELLED': '❌'
            }

            emoji = status_emoji.get(order.status, '❓')

            brand_name = order.car.brand.name if order.car.brand else "Неизвестно"
            model_name = order.car.model.name if order.car.model else "Неизвестно"

            text = (
                f"Заказ *№{order.id}*\n"
                f"🚗 {brand_name} {model_name}\n"
                f"💰 {order.total_price:,.0f} ₽\n"
                f"Статус: {emoji} {order.get_status_display()}\n"
                f"📅 {order.created_at.strftime('%d.%m.%Y')}"
            )

            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [InlineKeyboardButton(text="🔍 Отследить", callback_data=f"track_{order.id}")]
                ]
            )

            await message.answer(text, parse_mode="Markdown", reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Ошибка в show_orders: {e}")
        await message.answer("Ошибка при загрузке заказов")


@dp.message(F.text == "🔔 Подписки")
async def show_subscriptions(message: types.Message):
    """Показать подписки пользователя"""
    try:
        username = message.from_user.username or f"user_{message.from_user.id}"
        user = await get_user_by_username(username)

        if not user:
            await message.answer("Пользователь не найден. Используйте /start для регистрации.")
            return

        subscriptions = await get_user_subscriptions(user)

        if not subscriptions:
            await message.answer(
                "У вас нет активных подписок.\n\n"
                "Создайте подписку, чтобы получать уведомления о новых автомобилях, "
                "соответствующих вашим критериям!"
            )
            return

        await message.answer(f"🔔 Ваши подписки ({len(subscriptions)}):")

        for sub in subscriptions:
            text = f"🔍 Подписка №{sub.id}\n"

            if sub.brand:
                text += f"Марка: {sub.brand.name}\n"
            if sub.model:
                text += f"Модель: {sub.model.name}\n"
            if sub.year_min or sub.year_max:
                text += f"Год: {sub.year_min or 'любой'}-{sub.year_max or 'любой'}\n"
            if sub.price_min or sub.price_max:
                price_min = f"{sub.price_min:,.0f}" if sub.price_min else "любая"
                price_max = f"{sub.price_max:,.0f}" if sub.price_max else "любая"
                text += f"Цена: {price_min}-{price_max} ₽\n"

            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(text="✏️ Изменить", callback_data=f"edit_sub_{sub.id}"),
                        InlineKeyboardButton(text="❌ Удалить", callback_data=f"del_sub_{sub.id}")
                    ]
                ]
            )

            await message.answer(text, reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Ошибка в show_subscriptions: {e}")
        await message.answer("Ошибка при загрузке подписок")


@dp.message(F.text == "👤 Профиль")
async def show_profile(message: types.Message):
    """Показать профиль пользователя"""
    try:
        username = message.from_user.username or f"user_{message.from_user.id}"
        user = await get_user_by_username(username)

        if not user:
            await message.answer("Пользователь не найден. Используйте /start для регистрации.")
            return

        orders = await get_user_orders(user)
        subscriptions = await get_user_subscriptions(user)

        text = (
            f"👤 *Ваш профиль*\n\n"
            f"Имя: {user.first_name} {user.last_name}\n"
            f"Username: @{user.username}\n"
            f"Роль: {user.get_role_display()}\n"
            f"Телефон: {user.phone or 'не указан'}\n\n"
            f"📦 Заказов: {len(orders)}\n"
            f"🔔 Подписок: {len(subscriptions)}"
        )

        await message.answer(text, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Ошибка в show_profile: {e}")
        await message.answer("Ошибка при загрузке профиля")


# Callback обработчики
@dp.callback_query(F.data.startswith("order_"))
async def process_order_callback(callback: types.CallbackQuery):
    """Обработка заказа автомобиля"""
    vin = callback.data.split("_")[1]

    try:
        car = await get_car_by_vin(vin)
        if not car:
            await callback.answer("Автомобиль не найден", show_alert=True)
            return

        username = callback.from_user.username or f"user_{callback.from_user.id}"
        user = await get_user_by_username(username)

        if not user:
            await callback.answer("Пользователь не найден", show_alert=True)
            return

        # Получаем цену из объявления или используем базовую
        price = 1000000  # Базовая цена

        # Создаем заказ
        order = await create_order(user, car, price)

        brand_name = car.brand.name if car.brand else "Неизвестно"
        model_name = car.model.name if car.model else "Неизвестно"

        await callback.message.answer(
            f"✅ Заказ №{order.id} создан!\n\n"
            f"🚗 {brand_name} {model_name} ({car.year})\n"
            f"💰 {price:,.0f} ₽\n\n"
            "Наш менеджер свяжется с вами в ближайшее время."
        )

        await callback.answer()

    except Exception as e:
        logger.error(f"Ошибка при создании заказа: {e}")
        await callback.answer("Ошибка при создании заказа", show_alert=True)


@dp.callback_query(F.data.startswith("track_"))
async def process_track_callback(callback: types.CallbackQuery):
    """Отслеживание заказа"""
    order_id = callback.data.split("_")[1]

    try:
        order = await get_order_by_id(order_id)
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        # Получаем историю статусов
        history = await get_order_history(order)

        brand_name = order.car.brand.name if order.car.brand else "Неизвестно"
        model_name = order.car.model.name if order.car.model else "Неизвестно"

        text = (
            f"📦 *Заказ №{order.id}*\n"
            f"🚗 {brand_name} {model_name}\n"
            f"Статус: {order.get_status_display()}\n\n"
            f"📋 *История:*\n"
        )

        for h in history:
            text += f"• {h.created_at.strftime('%d.%m %H:%M')} - {h.get_status_display()}\n"

        await callback.message.answer(text, parse_mode="Markdown")
        await callback.answer()

    except Exception as e:
        logger.error(f"Ошибка при отслеживании: {e}")
        await callback.answer("Ошибка при отслеживании", show_alert=True)


async def main():
    """Запуск бота"""
    logger.info("Запуск Telegram бота...")
    try:
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Ошибка при запуске бота: {e}")
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
