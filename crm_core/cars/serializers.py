from rest_framework import serializers
from .models import (
    Brand,
    Model,
    User,
    Car,
    Advertisement,
    SearchRequest,
    Order,
    OrderStatusHistory
)
from django.utils import timezone

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']


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
        fields = ['id', 'name', 'brand', 'brand_id']


class UserSerializer(serializers.ModelSerializer):
    class RoleSerializer(serializers.Serializer):
        value = serializers.CharField()
        display = serializers.CharField()

    role_display = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'patronymic', 'phone',
            'role', 'role_display', 'full_name', 'email', 'is_active'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_role_display(self, obj):
        return {
            'value': obj.role,
            'display': obj.get_role_display()
        }

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
        user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            del validated_data['password']
        return super().update(instance, validated_data)


class CarSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        write_only=True,
        required=False
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(),
        write_only=True,
        required=False
    )
    fuel_type_display = serializers.SerializerMethodField()
    steering_wheel_display = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            'vin', 'brand', 'model', 'year', 'fuel_type', 'fuel_type_display',
            'engine_volume', 'engine_power', 'transmission', 'steering_wheel',
            'steering_wheel_display', 'drive_type', 'color', 'seller_country',
            'manufacturer_country', 'brand_id', 'model_id'
        ]
        read_only_fields = ['vin']

    def get_fuel_type_display(self, obj):
        return obj.get_fuel_type_display()

    def get_steering_wheel_display(self, obj):
        return obj.get_steering_wheel_display()

    def validate(self, data):
        if 'vin' in data and len(data['vin']) != 17:
            raise serializers.ValidationError({
                'vin': 'VIN должен содержать 17 символов'
            })
        
        if 'year' in data and (data['year'] < 1900 or data['year'] > timezone.now().year + 1):
            raise serializers.ValidationError({
                'year': f'Год выпуска должен быть между 1900 и {timezone.now().year + 1}'
            })
        
        return data


class AdvertisementSerializer(serializers.ModelSerializer):
    car = CarSerializer(read_only=True)
    car_vin = serializers.CharField(write_only=True)
    publication_date = serializers.DateTimeField(read_only=True)
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.CLIENT),
        write_only=True,
        required=False
    )

    class Meta:
        model = Advertisement
        fields = [
            'id', 'car', 'car_vin', 'car_price', 'mileage', 'condition',
            'publication_date', 'user', 'user_id'
        ]

    def create(self, validated_data):
        car_vin = validated_data.pop('car_vin')
        try:
            car = Car.objects.get(vin=car_vin)
        except Car.DoesNotExist:
            raise serializers.ValidationError({
                'car_vin': 'Автомобиль с таким VIN не найден'
            })
        
        user = self.context['request'].user
        if user.role != User.Role.CLIENT:
            raise serializers.ValidationError({
                'user': 'Только клиенты могут создавать объявления'
            })
        
        advertisement = Advertisement.objects.create(
            car=car,
            user=user,
            **validated_data
        )
        return advertisement


class SearchRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    model = ModelSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        write_only=True,
        required=False
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=Model.objects.all(),
        write_only=True,
        required=False
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
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    car = CarSerializer(read_only=True)
    manager = UserSerializer(read_only=True)
    status_display = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    car_vin = serializers.CharField(write_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'car', 'manager', 'car_vin', 'total_price', 'status',
            'status_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def validate(self, data):
        if 'car_vin' in data:
            try:
                car = Car.objects.get(vin=data['car_vin'])
            except Car.DoesNotExist:
                raise serializers.ValidationError({
                    'car_vin': 'Автомобиль с таким VIN не найден'
                })
            data['car'] = car
        
        # Проверка, что пользователь является клиентом
        user = self.context['request'].user
        if user.role != User.Role.CLIENT:
            raise serializers.ValidationError({
                'user': 'Только клиенты могут создавать заказы'
            })
        
        return data

    def create(self, validated_data):
        validated_data.pop('car_vin', None)  # Удаляем car_vin, так как он уже преобразован в car
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    status_display = serializers.SerializerMethodField()
    updated_by = UserSerializer(read_only=True)
    media_file = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'order', 'status', 'status_display', 'media_file',
            'created_at', 'updated_by', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'updated_by']

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_media_file(self, obj):
        if obj.media_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None

    def create(self, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)