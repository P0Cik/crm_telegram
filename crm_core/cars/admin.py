from django.contrib import admin, messages
from .models import (
    Brand, Model, User, Car, CarPhoto,
    SearchRequest, SearchProfile, Order, OrderStatusHistory,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'name_ru', 'name_en']
    search_fields = ['name', 'name_ru', 'name_en']


@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'model_group', 'brand']
    list_filter = ['brand']
    search_fields = ['name', 'brand__name']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'first_name', 'last_name', 'role', 'telegram_id', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'telegram_id']
    list_editable = ['role']


class CarPhotoInline(admin.TabularInline):
    model = CarPhoto
    extra = 0
    fields = ['path', 'category', 'ordering']



@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand', 'model', 'year', 'car_price', 'mileage', 'fuel_type', 'color',
                    'region', 'source', 'external_id', 'is_active']
    list_filter = ['source', 'is_active', 'brand', 'fuel_type', 'year']
    search_fields = ['vin', 'external_id', 'brand__name', 'model__name', 'badge']
    list_select_related = ['brand', 'model']
    inlines = [CarPhotoInline]
    readonly_fields = ['first_seen_at', 'last_seen_at', 'detail_fetched_at', 'source_metadata']



@admin.register(SearchRequest)
class SearchRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'brand', 'model', 'status', 'year_min', 'year_max',
                    'price_min', 'price_max', 'last_checked_at']
    list_filter = ['status', 'brand']
    search_fields = ['user__username', 'brand__name', 'model__name']


@admin.register(SearchProfile)
class SearchProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'manufacturer', 'model_group', 'is_active', 'max_pages', 'last_run_at']
    list_filter = ['is_active', 'source']
    search_fields = ['name', 'manufacturer', 'model_group']
    actions = ['run_sync']

    @admin.action(description='Запустить синхронизацию выбранных профилей')
    def run_sync(self, request, queryset):
        from .tasks import sync_encar_profile
        count = 0
        for profile in queryset:
            try:
                # Пытаемся через Celery; если брокер недоступен — синхронно
                sync_encar_profile.delay(profile.id)
            except Exception:
                sync_encar_profile(profile.id)
            count += 1
        self.message_user(request, f'Запущена синхронизация {count} профиля(ей)', messages.SUCCESS)


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    fields = ['status', 'comment', 'media_file', 'created_at', 'updated_by']
    readonly_fields = ['created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'car', 'manager', 'total_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'car__vin', 'car__external_id']
    list_editable = ['status', 'manager']
    inlines = [OrderStatusHistoryInline]

    def save_formset(self, request, form, formset, change):
        """Проставляем сотрудника и проверяем, что фото только на этапах перемещения."""
        instances = formset.save(commit=False)
        for obj in instances:
            if isinstance(obj, OrderStatusHistory):
                if obj.media_file and not Order.status_allows_photos(obj.status):
                    messages.warning(
                        request,
                        f'Фото для этапа «{obj.get_status_display()}» проигнорировано: '
                        f'фото-отчёт допустим только на этапах перемещения.'
                    )
                    obj.media_file = None
                if not obj.updated_by_id:
                    obj.updated_by = request.user
            obj.save()
        formset.save_m2m()
        for obj in formset.deleted_objects:
            obj.delete()


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'status', 'updated_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order__id']
