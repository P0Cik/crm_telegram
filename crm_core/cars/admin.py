from django.contrib import admin
from .models import Brand, Model, User, Car, Advertisement, SearchRequest, Order, OrderStatusHistory


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    search_fields = ['name']


@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'brand']
    list_filter = ['brand']
    search_fields = ['name', 'brand__name']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'first_name', 'last_name', 'role', 'telegram_id', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'telegram_id']
    list_editable = ['role']


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['vin', 'brand', 'model', 'year', 'fuel_type', 'color', 'seller_country']
    list_filter = ['brand', 'fuel_type', 'year']
    search_fields = ['vin', 'brand__name', 'model__name']


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ['id', 'car', 'car_price', 'mileage', 'condition', 'publication_date']
    list_filter = ['publication_date']
    search_fields = ['car__vin', 'vin']


@admin.register(SearchRequest)
class SearchRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'brand', 'model', 'status', 'year_min', 'year_max', 'price_min', 'price_max']
    list_filter = ['status', 'brand']
    search_fields = ['user__username', 'brand__name', 'model__name']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'car', 'manager', 'total_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'car__vin']
    list_editable = ['status', 'manager']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'status', 'updated_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order__id']
