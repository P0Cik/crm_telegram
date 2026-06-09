from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator


class Brand(models.Model):
    """Марка автомобиля."""
    name = models.CharField(max_length=255, verbose_name='Название', unique=True)
    name_en = models.CharField('Название (EN)', max_length=255, blank=True, default='')
    name_ru = models.CharField('Название (RU)', max_length=255, blank=True, default='')

    class Meta:
        verbose_name = 'Марка'
        verbose_name_plural = 'Марки'
        ordering = ['name']

    def __str__(self):
        return self.name


class Model(models.Model):
    """Модель автомобиля (полное название Encar, напр. "X5 (G05)")."""
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, verbose_name='Марка', related_name='models')
    name = models.CharField(max_length=255, verbose_name='Название')
    model_group = models.CharField('Группа модели', max_length=255, blank=True, default='')

    class Meta:
        verbose_name = 'Модель'
        verbose_name_plural = 'Модели'
        ordering = ['brand__name', 'name']
        unique_together = (('brand', 'name'),)

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Кастомная модель пользователя."""
    class Role(models.TextChoices):
        CLIENT = 'CLIENT', 'Клиент'
        MANAGER = 'MANAGER', 'Менеджер'
        CARRIER = 'CARRIER', 'Перевозчик'

    patronymic = models.CharField("Отчество", max_length=50, blank=True, null=True)
    phone = models.CharField("Номер телефона", max_length=20, blank=True, null=True,
                             help_text="Формат: +7(***)-***-**-**")
    role = models.CharField("Роль", max_length=20, choices=Role.choices, default=Role.CLIENT)
    telegram_id = models.BigIntegerField("Telegram ID", unique=True, null=True, blank=True,
                                         help_text="Уникальный ID пользователя в Telegram")

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name} {self.patronymic or ''}".strip()


class Car(models.Model):
    """
    Информационный объект "Автомобиль".

    Универсальная модель под несколько источников. Дедупликация — по паре
    (source, external_id). Записи не удаляются, а помечаются is_active=False.
    """
    class FuelType(models.TextChoices):
        PETROL = 'PETROL', 'Бензин'
        DIESEL = 'DIESEL', 'Дизель'
        HYBRID = 'HYBRID', 'Гибрид'
        ELECTRIC = 'ELECTRIC', 'Электричество'
        LPG = 'LPG', 'Газ (LPG)'
        OTHER = 'OTHER', 'Другое'

    class Steering(models.TextChoices):
        LEFT = 'LEFT', 'Левый'
        RIGHT = 'RIGHT', 'Правый'

    # --- Идентификация источника ---
    source = models.CharField('Источник', max_length=32, default='encar', db_index=True)
    external_id = models.CharField('ID в источнике', max_length=64, db_index=True)
    source_country = models.CharField('Страна источника', max_length=8, default='KR')
    source_url = models.URLField('Ссылка на источник', blank=True, default='')
    source_metadata = models.JSONField('Сырые данные источника', default=dict, blank=True)
    is_active = models.BooleanField('Активно', default=True, db_index=True)

    # --- Идентификация автомобиля ---
    vin = models.CharField("VIN номер", max_length=17, null=True, blank=True, db_index=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Марка')
    model = models.ForeignKey(Model, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Модель')
    badge = models.CharField('Комплектация', max_length=255, blank=True, default='')

    # --- Характеристики ---
    price_krw = models.BigIntegerField('Цена (KRW, воны)', null=True, blank=True)
    car_price = models.DecimalField('Цена (RUB)', max_digits=14, decimal_places=2, default=0)
    mileage = models.IntegerField('Пробег', default=0)
    condition = models.TextField('Состояние автомобиля', blank=True, default='')
    year = models.IntegerField("Год выпуска", validators=[MinValueValidator(1900)])
    year_month = models.IntegerField("Год-месяц (YYYYMM)", null=True, blank=True)
    fuel_type = models.CharField("Тип топлива", max_length=20, choices=FuelType.choices, default=FuelType.OTHER)
    fuel_type_raw = models.CharField("Тип топлива (оригинал)", max_length=50, blank=True, default='')
    engine_volume = models.FloatField("Объем двигателя (см³)", null=True, blank=True)
    engine_power = models.IntegerField("Мощность (л.с.)", null=True, blank=True)
    transmission = models.CharField("Коробка передач", max_length=50, blank=True, null=True)
    transmission_raw = models.CharField("КПП (оригинал)", max_length=50, blank=True, default='')
    steering_wheel = models.CharField("Расположение руля", max_length=10, choices=Steering.choices,
                                      blank=True, null=True, default=Steering.LEFT)
    drive_type = models.CharField("Привод", max_length=50, blank=True, null=True)
    color = models.CharField("Цвет", max_length=50, blank=True, null=True)
    color_raw = models.CharField("Цвет (оригинал)", max_length=50, blank=True, default='')
    color_hex = models.CharField("Цвет (HEX)", max_length=16, blank=True, default='')
    body_type = models.CharField("Тип кузова", max_length=50, blank=True, default='')
    seat_count = models.IntegerField("Количество мест", null=True, blank=True)
    region = models.CharField("Регион продавца", max_length=100, blank=True, default='')
    seller_country = models.CharField("Страна продавца", max_length=50, default='Южная Корея')
    manufacturer_country = models.CharField("Страна производителя", max_length=50, blank=True, null=True)
    origin_price_man = models.IntegerField("Цена нового (만원)", null=True, blank=True)

    # --- Описание ---
    description_ko = models.TextField("Описание (оригинал)", blank=True, default='')
    description_ru = models.TextField("Описание (RU)", blank=True, default='')

    # --- Служебные даты ---
    listed_at = models.DateTimeField("Дата размещения", null=True, blank=True)
    modified_at = models.DateTimeField("Дата изменения в источнике", null=True, blank=True)
    first_seen_at = models.DateTimeField("Впервые обнаружено", auto_now_add=True)
    last_seen_at = models.DateTimeField("В последний раз встречено", null=True, blank=True)
    detail_fetched_at = models.DateTimeField("Дозагружена деталь", null=True, blank=True)

    class Meta:
        verbose_name = "Автомобиль"
        verbose_name_plural = "Автомобили"
        unique_together = (('source', 'external_id'),)
        ordering = ['-first_seen_at']

    def __str__(self):
        brand = self.brand.name if self.brand else '?'
        model = self.model.name if self.model else '?'
        return f"{brand} {model} ({self.year}) [{self.source}:{self.external_id}]"


class CarPhoto(models.Model):
    """Фотография автомобиля (хранится относительный путь источника)."""
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='photos', verbose_name='Автомобиль')
    path = models.CharField('Путь', max_length=255)
    ordering = models.FloatField('Порядок', default=0)
    category = models.CharField('Категория', max_length=20, blank=True, default='')

    class Meta:
        verbose_name = 'Фото автомобиля'
        verbose_name_plural = 'Фото автомобилей'
        ordering = ['ordering']
        unique_together = (('car', 'path'),)

    @property
    def url(self):
        base = getattr(settings, 'ENCAR_IMAGE_BASE', 'https://ci.encar.com').rstrip('/')
        path = self.path if self.path.startswith('/') else '/' + self.path
        return f"{base}{path}"

    def __str__(self):
        return self.path




class SearchRequest(models.Model):
    """Пользовательский запрос (фильтры) для мониторинга новых предложений (подписка)."""
    class Status(models.TextChoices):
        TRACKED = 'TRACKED', 'Отслеживается'
        CANCELLED = 'CANCELLED', 'Отменен'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_requests', verbose_name="Пользователь")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Марка')
    model = models.ForeignKey(Model, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Модель')
    year_min = models.IntegerField("Год выпуска (от)", null=True, blank=True)
    year_max = models.IntegerField("Год выпуска (до)", null=True, blank=True)
    mileage_min = models.IntegerField("Пробег от (км)", null=True, blank=True)
    mileage_max = models.IntegerField("Пробег до (км)", null=True, blank=True)
    min_engine_volume = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Min Объем двигателя')
    max_engine_volume = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Max Объем двигателя')
    min_engine_power = models.IntegerField(null=True, blank=True, verbose_name='Min Мощность двигателя')
    max_engine_power = models.IntegerField(null=True, blank=True, verbose_name='Max Мощность двигателя')
    fuel_type = models.CharField("Тип топлива", max_length=20, blank=True, null=True)
    condition = models.CharField("Состояние", max_length=20, blank=True, null=True)
    price_min = models.DecimalField("Цена от", max_digits=14, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField("Цена до", max_digits=14, decimal_places=2, null=True, blank=True)
    transmission = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемая Коробка передач')
    steering_wheel = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемое Расположение руля')
    drive_type = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемый Привод')
    colors = models.CharField(max_length=255, null=True, blank=True, verbose_name='Запрашиваемые Цвета')
    country = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемая Страна')
    status = models.CharField("Статус запроса", max_length=20, choices=Status.choices, default=Status.TRACKED)
    last_checked_at = models.DateTimeField("Последняя проверка", null=True, blank=True,
                                           help_text="Watermark: авто, обнаруженные позже этой метки, ещё не проверялись")

    class Meta:
        verbose_name = "Запрос на поиск"
        verbose_name_plural = "Запросы на поиск"

    def __str__(self):
        return f"Запрос №{self.id} от {self.user.username}"


class SearchProfile(models.Model):
    """
    Профиль сбора данных из внешнего источника.

    Менеджер задаёт марку/группу модели для мониторинга через Django Admin.
    Заменяет внешний "парсер": сбор выполняется встроенным модулем Encar.
    """
    name = models.CharField('Название', max_length=255)
    source = models.CharField('Источник', max_length=32, default='encar')
    manufacturer = models.CharField('Производитель (Encar)', max_length=255,
                                    help_text='Например: BMW, 벤츠, 아우디')
    model_group = models.CharField('Группа модели (Encar)', max_length=255, blank=True, default='',
                                   help_text='Например: X5. Пусто = все модели марки')
    extra_q = models.JSONField('Доп. параметры q', default=dict, blank=True)
    max_pages = models.IntegerField('Макс. страниц за прогон', default=2)
    is_active = models.BooleanField('Активен', default=True)
    last_run_at = models.DateTimeField('Последний запуск', null=True, blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        verbose_name = 'Профиль сбора'
        verbose_name_plural = 'Профили сбора'
        ordering = ['name']

    def __str__(self):
        scope = self.manufacturer + (f" / {self.model_group}" if self.model_group else '')
        return f"{self.name} ({scope})"


# --- Конфигурация этапов заказа ---------------------------------------------
# Этапы перемещения автомобиля, на которых разрешено прикреплять фото-отчёт.
MOVEMENT_STATUSES = frozenset({
    'TO_WAREHOUSE_KR',
    'AT_WAREHOUSE_KR',
    'TO_BORDER',
    'TO_WAREHOUSE_RU',
    'TO_DESTINATION',
    'DELIVERED',
})


class Order(models.Model):
    """Формализованная заявка клиента на приобретение автомобиля."""
    class Status(models.TextChoices):
        REVIEW = 'REVIEW', 'На рассмотрении'
        APPLICATION = 'APPLICATION', 'Оформление заявки'
        AWAITING_PAYMENT = 'AWAITING_PAYMENT', 'Ожидается оплата'
        PURCHASE = 'PURCHASE', 'Выкуп автомобиля'
        TO_WAREHOUSE_KR = 'TO_WAREHOUSE_KR', 'В пути на склад (Корея)'
        AT_WAREHOUSE_KR = 'AT_WAREHOUSE_KR', 'Прибыл на склад (Корея)'
        DOCUMENTS = 'DOCUMENTS', 'Подготовка документов'
        SHIPPING_PREP = 'SHIPPING_PREP', 'Подготовка к отправке'
        TO_BORDER = 'TO_BORDER', 'В пути на границу'
        CUSTOMS = 'CUSTOMS', 'Таможенное оформление'
        TO_WAREHOUSE_RU = 'TO_WAREHOUSE_RU', 'В пути на склад (Россия)'
        TO_DESTINATION = 'TO_DESTINATION', 'В пути в город назначения'
        DELIVERED = 'DELIVERED', 'Автомобиль передан клиенту'
        CANCELLED = 'CANCELLED', 'Отменён'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name="Клиент")
    car = models.ForeignKey(Car, on_delete=models.PROTECT, related_name='orders', verbose_name="Автомобиль")

    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='managed_orders', verbose_name="Менеджер",
                                limit_choices_to={'role': User.Role.MANAGER})

    total_price = models.DecimalField("Итоговая цена заказа", max_digits=14, decimal_places=2)
    status = models.CharField("Статус заказа", max_length=30, choices=Status.choices, default=Status.REVIEW)

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']

    def __str__(self):
        return f"Заказ №{self.id} ({self.car})"

    @staticmethod
    def status_allows_photos(status_code):
        """Разрешены ли фото-отчёты на данном этапе (этап перемещения)."""
        return status_code in MOVEMENT_STATUSES


class OrderStatusHistory(models.Model):
    """
    История изменений статусов заказа с прикреплением медиафайлов (фото/видео)
    на этапах логистики. Фото допускаются только на этапах перемещения.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history', verbose_name="Заказ")
    status = models.CharField("Статус этапа", max_length=30, choices=Order.Status.choices)
    comment = models.TextField("Комментарий", blank=True, default='')
    media_file = models.FileField("Медиафайл", upload_to='order_media/%Y/%m/%d/', blank=True, null=True)

    created_at = models.DateTimeField("Дата и время фиксации", auto_now_add=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   verbose_name="Сотрудник", help_text="Кто загрузил отчет")

    class Meta:
        verbose_name = "История статуса заказа"
        verbose_name_plural = "Истории статусов заказов"
        ordering = ['-created_at']

    def __str__(self):
        return f"Заказ №{self.order_id} - {self.get_status_display()}"
