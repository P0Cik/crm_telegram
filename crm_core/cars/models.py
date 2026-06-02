from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator


class Brand(models.Model):
    """Марка автомобиля"""
    name = models.CharField(max_length=255, verbose_name='Название')

    def __str__(self):
        return self.name

class Model(models.Model):
    """Модель автомобиля"""
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, verbose_name='Марка')
    name = models.CharField(max_length=255, verbose_name='Название')

    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Кастомная модель пользователя. 
    """
    class Role(models.TextChoices):
        CLIENT = 'CLIENT', 'Клиент'
        MANAGER = 'MANAGER', 'Менеджер'
        CARRIER = 'CARRIER', 'Перевозчик'

    patronymic = models.CharField("Отчество", max_length=50, blank=True, null=True)
    phone = models.CharField("Номер телефона", max_length=20, blank=True, null=True, 
                             help_text="Формат: +7(***)-***-**-**")
    role = models.CharField("Роль", max_length=20, choices=Role.choices, default=Role.CLIENT)

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name} {self.patronymic}".strip()


class Car(models.Model):
    """
    Информационный объект "Автомобиль"
    """
    class FuelType(models.TextChoices):
        PETROL = 'PETROL', 'Бензин'
        ELECTRIC = 'ELECTRIC', 'Электричество'
        DIESEL = 'DIESEL', 'Дизель'
        HYBRID = 'HYBRID', 'Гибрид'

    class Condition(models.TextChoices):
        NEW = 'NEW', 'Новый'
        USED = 'USED', 'Подержанный'

    class Steering(models.TextChoices):
        LEFT = 'LEFT', 'Левый'
        RIGHT = 'RIGHT', 'Правый'

    vin = models.CharField("VIN номер", max_length=17, primary_key=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Марка')
    model = models.ForeignKey(Model, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Модель')
    year = models.IntegerField("Год выпуска", validators=[MinValueValidator(1900)])
    fuel_type = models.CharField("Тип топлива", max_length=20, choices=FuelType.choices)
    engine_volume = models.FloatField("Объем двигателя (л/см³)", null=True, blank=True)
    engine_power = models.IntegerField("Мощность (л.с.)", null=True, blank=True)
    transmission = models.CharField("Коробка передач", max_length=50, blank=True, null=True)
    steering_wheel = models.CharField("Расположение руля", max_length=10, choices=Steering.choices, blank=True, null=True)
    drive_type = models.CharField("Привод", max_length=50, blank=True, null=True)
    color = models.CharField("Цвет", max_length=50, blank=True, null=True)
    seller_country = models.CharField("Страна продавца", max_length=50, default='Южная Корея')
    manufacturer_country = models.CharField("Страна производителя", max_length=50, blank=True, null=True)


    class Meta:
        verbose_name = "Автомобиль"
        verbose_name_plural = "Автомобили"

    def __str__(self):
        return f"{self.make} {self.model} ({self.year}) - {self.vin}"
    

class Advertisement(models.Model):
    """Объявление о продаже автомобиля"""
    car = models.ForeignKey(Car, on_delete=models.CASCADE, verbose_name='Автомобиль')
    car_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Цена автомобиля')
    mileage = models.IntegerField(verbose_name='Пробег')
    condition = models.TextField(verbose_name='Состояние автомобиля')
    publication_date = models.DateField(auto_now_add=True, verbose_name='Дата публикации')
    vin = models.CharField(max_length=17, verbose_name='VIN номер')

    def __str__(self):
        return f"Объявление #{self.id} - {self.car}"


class SearchRequest(models.Model):
    """
    Пользовательский запрос (фильтры) для мониторинга новых предложений.
    """
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
    price_min = models.DecimalField("Цена от", max_digits=12, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField("Цена до", max_digits=12, decimal_places=2, null=True, blank=True)
    transmission = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемая Коробка передач')
    steering_wheel = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемое Расположение руля')
    drive_type = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемый Привод')
    colors = models.CharField(max_length=255, null=True, blank=True, verbose_name='Запрашиваемые Цвета')
    country = models.CharField(max_length=50, null=True, blank=True, verbose_name='Запрашиваемая Страна')
    status = models.CharField("Статус запроса", max_length=20, choices=Status.choices, default=Status.TRACKED)


    class Meta:
        verbose_name = "Запрос на поиск"
        verbose_name_plural = "Запросы на поиск"

    def __str__(self):
        return f"Запрос №{self.id} от {self.user.username}"


class Order(models.Model):
    """
    Формализованная заявка клиента на приобретение автомобиля.
    """
    class Status(models.TextChoices):
        PROCESSING = 'PROCESSING', 'В обработке'
        WAREHOUSE_KR = 'WAREHOUSE_KR', 'Доставлен на склад (Корея)'
        IN_TRANSIT_BORDER = 'IN_TRANSIT_BORDER', 'В пути на границу'
        AT_BORDER = 'AT_BORDER', 'На границе'
        WAREHOUSE_RU = 'WAREHOUSE_RU', 'Доставлен на склад (Россия)'
        IN_TRANSIT_RU = 'IN_TRANSIT_RU', 'В пути по России'
        DELIVERED = 'DELIVERED', 'Доставлен'
        CANCELLED = 'CANCELLED', 'Отменен'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name="Клиент")
    car = models.ForeignKey(Car, on_delete=models.PROTECT, related_name='orders', verbose_name="Автомобиль", to_field='vin')
    
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='managed_orders', verbose_name="Менеджер", 
                                limit_choices_to={'role': User.Role.MANAGER})
    
    total_price = models.DecimalField("Итоговая цена заказа", max_digits=12, decimal_places=2)
    status = models.CharField("Статус заказа", max_length=30, choices=Status.choices, default=Status.PROCESSING)
    
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"

    def __str__(self):
        return f"Заказ №{self.id} ({self.car.vin})"


class OrderStatusHistory(models.Model):
    """
    Хранение истории изменений статусов заказа и прикрепление 
    медиафайлов (фото/видео) на каждом этапе логистики (п. 2.3 "Состояние товара").
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history', verbose_name="Заказ")
    status = models.CharField("Статус этапа", max_length=30, choices=Order.Status.choices)
    media_file = models.FileField("Медиафайл", upload_to='order_media/%Y/%m/%d/', blank=True, null=True)
    
    created_at = models.DateTimeField("Дата и время фиксации", auto_now_add=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                   verbose_name="Сотрудник", help_text="Кто загрузил отчет")

    class Meta:
        verbose_name = "История статуса заказа"
        verbose_name_plural = "Истории статусов заказов"
        ordering = ['-created_at']

    def __str__(self):
        return f"Заказ №{self.order.id} - {self.get_status_display()}"