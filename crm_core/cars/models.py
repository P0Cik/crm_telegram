from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator


# --- Справочник марок / групп / моделей --------------------------------------
# Иерархия повторяет faceted-навигацию Encar (inav):
#   Manufacturer -> ModelGroup -> Model
# Каждый уровень хранит исходное (корейское) значение источника и переводы.
# Основной язык отображения для каталога — английский (EN), русский — опционален.

class TranslatableNameMixin(models.Model):
    """Общие поля названия справочника.

    name_ko — исходное значение источника (Encar Value, может быть латиницей).
    name_en — английское название (основное для отображения каталога), берётся
    из Metadata.EngName фасетов inav / *EnglishName детальной карточки Encar.
    """
    source = models.CharField('Источник', max_length=32, default='encar', db_index=True)
    code = models.CharField('Код источника', max_length=32, blank=True, default='')
    name_ko = models.CharField('Название (источник)', max_length=255)
    name_en = models.CharField('Название (EN)', max_length=255, blank=True, default='')

    class Meta:
        abstract = True

    def display_name(self, lang='en'):
        """Каталог отображается на английском; при отсутствии — исходное значение."""
        return self.name_en or self.name_ko

    def __str__(self):
        return self.display_name()


class Brand(TranslatableNameMixin):
    """Марка автомобиля (제조사 / Manufacturer)."""

    class Meta:
        verbose_name = 'Марка'
        verbose_name_plural = 'Марки'
        ordering = ['name_en', 'name_ko']
        unique_together = (('source', 'name_ko'),)


class ModelGroup(TranslatableNameMixin):
    """Группа моделей (예: X5, 5시리즈 / ModelGroup)."""
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE,
                              related_name='model_groups', verbose_name='Марка')

    class Meta:
        verbose_name = 'Группа моделей'
        verbose_name_plural = 'Группы моделей'
        ordering = ['brand__name_en', 'name_en', 'name_ko']
        unique_together = (('brand', 'name_ko'),)


class Model(TranslatableNameMixin):
    """Полная модель Encar (예: "X5 (G05)", "5시리즈 (G60)")."""
    model_group = models.ForeignKey(ModelGroup, on_delete=models.CASCADE,
                                    related_name='models', verbose_name='Группа моделей')

    class Meta:
        verbose_name = 'Модель'
        verbose_name_plural = 'Модели'
        ordering = ['model_group__brand__name_en', 'name_en', 'name_ko']
        unique_together = (('model_group', 'name_ko'),)

    @property
    def brand(self):
        return self.model_group.brand


class ValueTranslation(models.Model):
    """
    Единый справочник значений-перечислений Encar (топливо, КПП, кузов, цвет,
    цвет салона, регион). Это ЕДИНСТВЕННЫЙ источник переводов на рантайме:
    нормализация (cars/encar/normalization.py) читает только из него (через
    кеш в памяти), статических словарей в коде больше нет.

    Наполняется:
      * первичным сидом из inav (data-миграция 0003 — все возможные значения с
        переводами RU/EN, canonical-кодом и hex-цветом);
      * автопереводом новых значений (cars/encar/translate.py);
      * вручную через админку.

    Порядок разрешения: эта таблица -> сырое значение (с постановкой в очередь на
    автоперевод, если перевода ещё нет).

    Поля canonical/name_hex нужны не всем видам:
      * canonical — код для БД у топлива (PETROL/DIESEL/...) и КПП (AUTO/...);
      * name_hex — HEX-цвет для color/seatcolor (для отрисовки кружка во фронте).
    """
    class Kind(models.TextChoices):
        FUEL = 'fuel', 'Топливо'
        TRANSMISSION = 'transmission', 'Коробка передач'
        BODY_TYPE = 'body_type', 'Тип кузова'
        COLOR = 'color', 'Цвет'
        SEATCOLOR = 'seatcolor', 'Цвет салона'
        REGION = 'region', 'Регион'

    kind = models.CharField('Тип значения', max_length=20, choices=Kind.choices, db_index=True)
    source_value = models.CharField('Исходное значение (источник)', max_length=255)
    name_ru = models.CharField('Перевод (RU)', max_length=255, blank=True, default='')
    name_en = models.CharField('Перевод (EN)', max_length=255, blank=True, default='')
    canonical = models.CharField('Canonical-код', max_length=20, blank=True, default='',
                                 help_text='Код для БД (топливо: PETROL/DIESEL/...; КПП: AUTO/MANUAL/...)')
    name_hex = models.CharField('Цвет (HEX)', max_length=16, blank=True, default='',
                                help_text='HEX-цвет значения (для цвета кузова/салона)')
    auto = models.BooleanField('Автоперевод', default=False,
                               help_text='Снимите галочку при ручной правке, чтобы автоперевод не перезаписывал значение')
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Перевод значения'
        verbose_name_plural = 'Переводы значений'
        unique_together = (('kind', 'source_value'),)
        ordering = ['kind', 'source_value']

    def __str__(self):
        return f"[{self.get_kind_display()}] {self.source_value} → {self.name_ru or self.name_en or '—'}"

    @property
    def pending(self) -> bool:
        """Перевод ещё не получен (ждёт автоперевода)."""
        return not (self.name_ru or self.name_en)


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


# --- Курс валют --------------------------------------------------------------
class ExchangeRate(models.Model):
    """
    Курс конвертации валют (напр. KRW->RUB). Обновляется задачей
    update_exchange_rates по данным ЦБ РФ. Цена авто хранится только в исходной
    валюте (воны), рубли вычисляются по требованию через cars/currency.py.
    """
    base = models.CharField('Базовая валюта', max_length=8, default='KRW')
    quote = models.CharField('Котируемая валюта', max_length=8, default='RUB')
    rate = models.DecimalField('Курс (quote за 1 base)', max_digits=18, decimal_places=8)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Курс валют'
        verbose_name_plural = 'Курсы валют'
        unique_together = (('base', 'quote'),)

    def __str__(self):
        return f"{self.base}->{self.quote}: {self.rate}"


class Car(models.Model):
    """
    Информационный объект "Автомобиль".

    Универсальная модель под несколько источников. Дедупликация — по паре
    (source, external_id). Записи не удаляются, а помечаются is_active=False.
    Цена хранится только в исходной валюте (price_krw, воны); рубли вычисляются
    по требованию (см. cars/currency.py и CarSerializer).
    """
    class FuelType(models.TextChoices):
        PETROL = 'PETROL', 'Бензин'
        DIESEL = 'DIESEL', 'Дизель'
        HYBRID = 'HYBRID', 'Гибрид'
        ELECTRIC = 'ELECTRIC', 'Электричество'
        LPG = 'LPG', 'Газ (LPG)'
        OTHER = 'OTHER', 'Другое'

    class SalesStatus(models.TextChoices):
        ON_SALE = 'ON_SALE', 'В продаже'
        CONTRACT = 'CONTRACT', 'Бронь / договор'
        SOLD = 'SOLD', 'Продан'

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
    model_group = models.ForeignKey(ModelGroup, on_delete=models.SET_NULL, null=True, blank=True,
                                    verbose_name='Группа моделей')
    model = models.ForeignKey(Model, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Модель')
    badge = models.CharField('Комплектация', max_length=255, blank=True, default='')
    badge_en = models.CharField('Комплектация (EN)', max_length=255, blank=True, default='')
    vehicle_no = models.CharField('Гос. номер (источник)', max_length=32, blank=True, default='')

    # --- Цена (только воны; рубли — по требованию) ---
    price_krw = models.BigIntegerField('Цена (KRW, воны)', null=True, blank=True)
    origin_price_krw = models.BigIntegerField('Цена нового (KRW, воны)', null=True, blank=True)

    # --- Характеристики ---
    mileage = models.IntegerField('Пробег (км)', default=0)
    year = models.IntegerField("Год выпуска", validators=[MinValueValidator(1900)])
    year_month = models.IntegerField("Год-месяц (YYYYMM)", null=True, blank=True)
    fuel_type = models.CharField("Тип топлива", max_length=20, choices=FuelType.choices, default=FuelType.OTHER)
    fuel_type_raw = models.CharField("Тип топлива (оригинал)", max_length=50, blank=True, default='')
    engine_volume = models.FloatField("Объем двигателя (см³)", null=True, blank=True)
    transmission = models.CharField("Коробка передач", max_length=50, blank=True, default='')
    transmission_raw = models.CharField("КПП (оригинал)", max_length=50, blank=True, default='')
    color = models.CharField("Цвет", max_length=50, blank=True, default='')
    color_raw = models.CharField("Цвет (оригинал)", max_length=50, blank=True, default='')
    color_hex = models.CharField("Цвет (HEX)", max_length=16, blank=True, default='')
    interior_color = models.CharField("Цвет салона", max_length=50, blank=True, default='')
    interior_color_raw = models.CharField("Цвет салона (оригинал)", max_length=50, blank=True, default='')
    interior_color_hex = models.CharField("Цвет салона (HEX)", max_length=16, blank=True, default='')
    body_type = models.CharField("Тип кузова", max_length=50, blank=True, default='')
    body_type_raw = models.CharField("Тип кузова (оригинал)", max_length=50, blank=True, default='')
    seat_count = models.IntegerField("Количество мест", null=True, blank=True)
    region = models.CharField("Регион продавца", max_length=100, blank=True, default='')
    region_raw = models.CharField("Регион (оригинал)", max_length=100, blank=True, default='')

    # --- Состояние / статус ---
    sales_status = models.CharField("Статус продажи", max_length=20, choices=SalesStatus.choices,
                                    default=SalesStatus.ON_SALE)
    has_accident_record = models.BooleanField("Есть записи об авариях", null=True, blank=True)

    # --- Описание ---
    description_ko = models.TextField("Описание (оригинал)", blank=True, default='')
    description_ru = models.TextField("Описание (RU)", blank=True, default='')

    # --- Служебные даты ---
    listed_at = models.DateTimeField("Дата размещения", null=True, blank=True)
    modified_at = models.DateTimeField("Дата изменения в источнике", null=True, blank=True, db_index=True)
    first_seen_at = models.DateTimeField("Впервые обнаружено", auto_now_add=True)
    last_seen_at = models.DateTimeField("В последний раз встречено", null=True, blank=True)
    detail_fetched_at = models.DateTimeField("Дозагружена деталь", null=True, blank=True)

    class Meta:
        verbose_name = "Автомобиль"
        verbose_name_plural = "Автомобили"
        unique_together = (('source', 'external_id'),)
        ordering = ['-first_seen_at']

    def __str__(self):
        brand = self.brand.display_name() if self.brand else '?'
        model = self.model.display_name() if self.model else '?'
        return f"{brand} {model} ({self.year}) [{self.source}:{self.external_id}]"

    def price_rub(self, rate=None):
        """Цена в рублях по текущему курсу (вычисляется, не хранится)."""
        from .currency import krw_to_rub
        return krw_to_rub(self.price_krw, rate=rate)


class CarPhoto(models.Model):
    """Фотография автомобиля (хранится относительный путь источника)."""
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='photos', verbose_name='Автомобиль')
    path = models.CharField('Путь', max_length=255)
    image_number = models.IntegerField('Номер изображения', default=0, db_index=True,
                                       help_text='Номер из имени файла (..._NNN.jpg) / поля code; задаёт порядок')
    ordering = models.FloatField('Порядок', default=0)
    category = models.CharField('Категория', max_length=20, blank=True, default='')

    class Meta:
        verbose_name = 'Фото автомобиля'
        verbose_name_plural = 'Фото автомобилей'
        # Фото идут по возрастанию номера изображения (поле image_number); ordering
        # — запасной ключ для совместимости со старыми записями.
        ordering = ['image_number', 'ordering']
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
    model_group = models.ForeignKey(ModelGroup, on_delete=models.SET_NULL, null=True, blank=True,
                                    verbose_name='Группа моделей')
    model = models.ForeignKey(Model, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Модель')
    year_min = models.IntegerField("Год выпуска (от)", null=True, blank=True)
    year_max = models.IntegerField("Год выпуска (до)", null=True, blank=True)
    mileage_min = models.IntegerField("Пробег от (км)", null=True, blank=True)
    mileage_max = models.IntegerField("Пробег до (км)", null=True, blank=True)
    min_engine_volume = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                            verbose_name='Min объём двигателя (л)')
    max_engine_volume = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                            verbose_name='Max объём двигателя (л)')
    fuel_type = models.CharField("Тип топлива", max_length=20, blank=True, null=True)
    body_type = models.CharField("Тип кузова", max_length=50, blank=True, null=True)
    price_min = models.DecimalField("Цена от (RUB)", max_digits=14, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField("Цена до (RUB)", max_digits=14, decimal_places=2, null=True, blank=True)
    transmission = models.CharField(max_length=50, null=True, blank=True, verbose_name='Коробка передач')
    colors = models.CharField(max_length=255, null=True, blank=True, verbose_name='Цвета')
    status = models.CharField("Статус запроса", max_length=20, choices=Status.choices, default=Status.TRACKED)
    last_checked_at = models.DateTimeField("Последняя проверка", null=True, blank=True,
                                           help_text="Watermark: авто, обнаруженные позже этой метки, ещё не проверялись")

    class Meta:
        verbose_name = "Запрос на поиск"
        verbose_name_plural = "Запросы на поиск"

    def __str__(self):
        return f"Запрос №{self.id} от {self.user.username}"


class ImportProfile(models.Model):
    """
    Профиль импорта данных из внешнего источника.

    Менеджер задаёт марку/группу моделей для мониторинга через Django Admin
    (выпадающие списки на основе справочника). Сбор выполняет встроенный модуль
    импорта (cars/encar).
    """
    class Market(models.TextChoices):
        IMPORT = 'N', 'Импортные (ввезённые в Корею)'
        DOMESTIC = 'Y', 'Внутренний рынок Кореи'
        ALL = 'A', 'Все'

    name = models.CharField('Название', max_length=255)
    source = models.CharField('Источник', max_length=32, default='encar')
    car_type = models.CharField('Рынок', max_length=1, choices=Market.choices, default=Market.IMPORT,
                                help_text='Какие авто тянуть: импортные, внутренний рынок Кореи или все')
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name='import_profiles',
                              verbose_name='Марка')
    model_group = models.ForeignKey(ModelGroup, on_delete=models.PROTECT, null=True, blank=True,
                                    related_name='import_profiles', verbose_name='Группа моделей',
                                    help_text='Пусто = все модели марки')
    extra_q = models.JSONField('Доп. параметры q', default=dict, blank=True)
    page_size = models.IntegerField('Размер страницы', default=100,
                                    help_text='Записей за запрос к list/mobile (до 1000)')
    max_pages = models.IntegerField('Макс. страниц за прогон', default=5)
    backfill_completed = models.BooleanField('Полная выгрузка завершена', default=False,
                                             help_text='После полной первичной выгрузки включается ранний останов')
    is_active = models.BooleanField('Активен', default=True)
    last_run_at = models.DateTimeField('Последний запуск', null=True, blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        verbose_name = 'Профиль импорта'
        verbose_name_plural = 'Профили импорта'
        ordering = ['name']

    def __str__(self):
        scope = self.brand.display_name()
        if self.model_group_id:
            scope += f" / {self.model_group.display_name()}"
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

    total_price = models.DecimalField("Итоговая цена заказа (RUB)", max_digits=14, decimal_places=2,
                                      help_text="Снапшот цены в рублях на момент оформления")
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
