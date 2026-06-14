from rest_framework import serializers
from .models import (
    Brand,
    ModelGroup,
    Model,
    User,
    Car,
    CarPhoto,
    SearchRequest,
    ImportProfile,
    Order,
    OrderStatusHistory,
)
from django.utils import timezone


class BrandSerializer(serializers.ModelSerializer):
    # name — основное отображение каталога (английский)
    name = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'name_en', 'name_ko']

    def get_name(self, obj):
        return obj.display_name('en')


class ModelGroupSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False
    )

    class Meta:
        model = ModelGroup
        fields = ['id', 'name', 'name_en', 'name_ko', 'brand', 'brand_id']

    def get_name(self, obj):
        return obj.display_name('en')


class ModelSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    model_group = ModelGroupSerializer(read_only=True)
    model_group_id = serializers.PrimaryKeyRelatedField(
        queryset=ModelGroup.objects.all(), source='model_group', write_only=True, required=False
    )
    # brand для удобства фронтенда (модель -> марка через группу)
    brand = serializers.SerializerMethodField()

    class Meta:
        model = Model
        fields = ['id', 'name', 'name_en', 'name_ko', 'model_group', 'model_group_id', 'brand']

    def get_name(self, obj):
        return obj.display_name('en')

    def get_brand(self, obj):
        return BrandSerializer(obj.model_group.brand).data if obj.model_group_id else None


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
        fields = ['id', 'url', 'image_number', 'ordering', 'category']


class CarSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    model_group = ModelGroupSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(), source='model', write_only=True, required=False
    )
    fuel_type_display = serializers.SerializerMethodField()
    sales_status_display = serializers.SerializerMethodField()
    # Цена: исходная в вонах + вычисляемая в рублях (по текущему курсу)
    price_won = serializers.IntegerField(source='price_krw', read_only=True)
    price_rub = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    photos = CarPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Car
        fields = [
            'id', 'source', 'external_id', 'source_url', 'is_active',
            'vin', 'vehicle_no', 'brand', 'model_group', 'model', 'badge', 'badge_en',
            'year', 'year_month', 'fuel_type', 'fuel_type_display',
            'engine_volume', 'transmission', 'color', 'color_hex',
            'interior_color', 'interior_color_hex', 'body_type',
            'seat_count', 'region', 'sales_status', 'sales_status_display',
            'has_accident_record', 'origin_price_krw',
            'description_ko', 'description_ru',
            'price_won', 'price_rub', 'mileage', 'images', 'photos',
            'brand_id', 'model_id',
        ]

    def get_fuel_type_display(self, obj):
        return obj.get_fuel_type_display()

    def get_sales_status_display(self, obj):
        return obj.get_sales_status_display()

    def get_price_rub(self, obj):
        rate = self.context.get('krw_rub_rate')
        value = obj.price_rub(rate=rate)
        return float(value) if value is not None else None

    def get_images(self, obj):
        return [p.url for p in obj.photos.all()]

    def validate(self, data):
        if 'year' in data and (data['year'] < 1900 or data['year'] > timezone.now().year + 1):
            raise serializers.ValidationError(
                {'year': f'Год выпуска должен быть между 1900 и {timezone.now().year + 1}'}
            )
        return data


class SearchRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    model_group = ModelGroupSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False, allow_null=True
    )
    model_group_id = serializers.PrimaryKeyRelatedField(
        queryset=ModelGroup.objects.all(), source='model_group', write_only=True, required=False, allow_null=True
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(), source='model', write_only=True, required=False, allow_null=True
    )
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = SearchRequest
        fields = [
            'id', 'user', 'brand', 'model_group', 'model', 'year_min', 'year_max',
            'mileage_min', 'mileage_max', 'min_engine_volume', 'max_engine_volume',
            'fuel_type', 'body_type', 'price_min', 'price_max', 'transmission', 'colors',
            'status', 'status_display', 'brand_id', 'model_group_id', 'model_id'
        ]
        read_only_fields = ['user']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ImportProfileSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    model_group = ModelGroupSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True
    )
    model_group_id = serializers.PrimaryKeyRelatedField(
        queryset=ModelGroup.objects.all(), source='model_group', write_only=True,
        required=False, allow_null=True
    )

    class Meta:
        model = ImportProfile
        fields = [
            'id', 'name', 'source', 'brand', 'brand_id', 'model_group', 'model_group_id',
            'extra_q', 'page_size', 'max_pages', 'backfill_completed', 'is_active',
            'last_run_at', 'created_at'
        ]
        read_only_fields = ['last_run_at', 'created_at', 'backfill_completed']


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
    total_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    client_name = serializers.CharField(write_only=True, required=False)
    client_phone = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'car', 'car_id', 'car_vin', 'manager', 'total_price',
            'status', 'status_display', 'status_history', 'client_name', 'client_phone', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def validate(self, data):
        # Если передан car_vin вместо car_id — резолвим
        if 'car' not in data and data.get('car_vin'):
            car = (Car.objects.filter(vin=data['car_vin']).first()
                   or Car.objects.filter(external_id=data['car_vin']).first())
            if not car:
                raise serializers.ValidationError({'car_vin': 'Автомобиль не найден'})
            data['car'] = car
        if 'car' not in data:
            raise serializers.ValidationError({'car_id': 'Укажите автомобиль (car_id или car_vin)'})
        return data

    def create(self, validated_data):
        validated_data.pop('car_vin', None)
        client_name = validated_data.pop('client_name', None)
        client_phone = validated_data.pop('client_phone', None)
        
        user = self.context['request'].user
        update_fields = []
        if client_name:
            parts = client_name.split(' ', 1)
            user.first_name = parts[0][:150]
            if len(parts) > 1:
                user.last_name = parts[1][:150]
            update_fields.extend(['first_name', 'last_name'])
        if client_phone:
            user.phone = client_phone[:50]
            update_fields.append('phone')
            
        if update_fields:
            user.save(update_fields=update_fields)

        order = super().create(validated_data)
        # Устанавливаем пользователя (по идее perform_create во ViewSet уже это делает, но на всякий случай)
        order.user = user
        order.save(update_fields=['user'])
        
        if not order.total_price:
            # Снапшот цены в рублях на момент оформления
            order.total_price = order.car.price_rub() or 0
            order.save(update_fields=['total_price'])
        return order
