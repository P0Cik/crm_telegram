from rest_framework import serializers
from .models import (
    Brand,
    Model,
    User,
    Car,
    CarPhoto,
    Advertisement,
    SearchRequest,
    SearchProfile,
    Order,
    OrderStatusHistory,
)
from django.utils import timezone


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'name_ru', 'name_en']


class ModelSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        source='brand',
        write_only=True,
        required=False
    )

    class Meta:
        model = Model
        fields = ['id', 'name', 'model_group', 'brand', 'brand_id']


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'patronymic', 'phone',
            'role', 'role_display', 'full_name', 'email', 'is_active', 'telegram_id'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_role_display(self, obj):
        return {'value': obj.role, 'display': obj.get_role_display()}

    def get_full_name(self, obj):
        return obj.full_name

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            patronymic=validated_data.get('patronymic', ''),
            phone=validated_data.get('phone', ''),
            role=validated_data.get('role', User.Role.CLIENT),
            email=validated_data.get('email', '')
        )
        if 'password' in validated_data:
            user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            del validated_data['password']
        return super().update(instance, validated_data)


class CarPhotoSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)

    class Meta:
        model = CarPhoto
        fields = ['id', 'url', 'ordering', 'category']


class CarSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(), source='model', write_only=True, required=False
    )
    fuel_type_display = serializers.SerializerMethodField()
    steering_wheel_display = serializers.SerializerMethodField()
    # Данные текущего объявления + фото — закрывают контракт фронтенда
    price_won = serializers.SerializerMethodField()
    price_rub = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            'id', 'source', 'external_id', 'source_url', 'is_active',
            'vin', 'brand', 'model', 'model_group', 'badge',
            'year', 'year_month', 'fuel_type', 'fuel_type_display',
            'engine_volume', 'engine_power', 'transmission', 'steering_wheel',
            'steering_wheel_display', 'drive_type', 'color', 'color_hex', 'body_type',
            'seat_count', 'region', 'seller_country', 'manufacturer_country',
            'origin_price_man', 'description_ko', 'description_ru',
            'price_won', 'price_rub', 'mileage', 'images',
            'brand_id', 'model_id',
        ]

    def _active_ad(self, obj):
        ads = list(obj.advertisements.all())
        active = [a for a in ads if a.is_active]
        if active:
            return active[0]
        return ads[0] if ads else None

    def get_fuel_type_display(self, obj):
        return obj.get_fuel_type_display()

    def get_steering_wheel_display(self, obj):
        return obj.get_steering_wheel_display() if obj.steering_wheel else None

    def get_price_won(self, obj):
        ad = self._active_ad(obj)
        return ad.price_krw if ad else None

    def get_price_rub(self, obj):
        ad = self._active_ad(obj)
        return float(ad.car_price) if ad and ad.car_price else None

    def get_mileage(self, obj):
        ad = self._active_ad(obj)
        return ad.mileage if ad else None

    def get_images(self, obj):
        return [p.url for p in obj.photos.all()]

    def validate(self, data):
        if 'year' in data and (data['year'] < 1900 or data['year'] > timezone.now().year + 1):
            raise serializers.ValidationError(
                {'year': f'Год выпуска должен быть между 1900 и {timezone.now().year + 1}'}
            )
        return data


class AdvertisementSerializer(serializers.ModelSerializer):
    car = CarSerializer(read_only=True)
    car_id = serializers.PrimaryKeyRelatedField(
        queryset=Car.objects.all(), source='car', write_only=True
    )
    publication_date = serializers.DateField(read_only=True)

    class Meta:
        model = Advertisement
        fields = [
            'id', 'car', 'car_id', 'external_id', 'price_krw', 'car_price',
            'mileage', 'condition', 'is_active', 'publication_date'
        ]


class SearchRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False, allow_null=True
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(), source='model', write_only=True, required=False, allow_null=True
    )
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = SearchRequest
        fields = [
            'id', 'user', 'brand', 'model', 'year_min', 'year_max', 'mileage_min',
            'mileage_max', 'min_engine_volume', 'max_engine_volume', 'min_engine_power',
            'max_engine_power', 'fuel_type', 'condition', 'price_min', 'price_max',
            'transmission', 'steering_wheel', 'drive_type', 'colors', 'country',
            'status', 'status_display', 'brand_id', 'model_id'
        ]
        read_only_fields = ['user']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SearchProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchProfile
        fields = [
            'id', 'name', 'source', 'manufacturer', 'model_group', 'extra_q',
            'max_pages', 'is_active', 'last_run_at', 'created_at'
        ]
        read_only_fields = ['last_run_at', 'created_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    updated_by = UserSerializer(read_only=True)
    media_file_url = serializers.SerializerMethodField()
    media_file = serializers.FileField(write_only=True, required=False, allow_null=True)
    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), source='order', write_only=True
    )
    allows_photos = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'order_id', 'status', 'status_display', 'comment',
            'media_file', 'media_file_url', 'allows_photos', 'created_at', 'updated_by'
        ]
        read_only_fields = ['created_at', 'updated_by']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_allows_photos(self, obj):
        return Order.status_allows_photos(obj.status)

    def get_media_file_url(self, obj):
        if obj.media_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None

    def validate(self, data):
        # Фото допускаются только на этапах перемещения
        status_code = data.get('status')
        if data.get('media_file') and status_code and not Order.status_allows_photos(status_code):
            raise serializers.ValidationError(
                {'media_file': 'Фото можно прикреплять только на этапах перемещения автомобиля'}
            )
        return data

    def create(self, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    car = CarSerializer(read_only=True)
    manager = UserSerializer(read_only=True)
    status_display = serializers.SerializerMethodField()
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    car_id = serializers.PrimaryKeyRelatedField(
        queryset=Car.objects.all(), source='car', write_only=True, required=False
    )
    car_vin = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'car', 'car_id', 'car_vin', 'manager', 'total_price',
            'status', 'status_display', 'status_history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def validate(self, data):
        # Если передан car_vin вместо car_id — резолвим
        if 'car' not in data and data.get('car_vin'):
            try:
                data['car'] = Car.objects.filter(vin=data['car_vin']).first() or \
                    Car.objects.get(external_id=data['car_vin'])
            except Car.DoesNotExist:
                raise serializers.ValidationError({'car_vin': 'Автомобиль не найден'})
        if 'car' not in data:
            raise serializers.ValidationError({'car_id': 'Укажите автомобиль (car_id или car_vin)'})
        return data

    def create(self, validated_data):
        validated_data.pop('car_vin', None)
        validated_data['user'] = self.context['request'].user
        if not validated_data.get('total_price'):
            ad = validated_data['car'].advertisements.filter(is_active=True).first()
            validated_data['total_price'] = (ad.car_price if ad else 0) or 0
        return super().create(validated_data)
