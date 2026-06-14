from django import forms
from django.contrib import admin, messages
from .models import (
    Brand, ModelGroup, Model, User, Car, CarPhoto,
    SearchRequest, ImportProfile, Order, OrderStatusHistory, ExchangeRate,
    ValueTranslation,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'name_en', 'name_ko', 'code', 'source']
    search_fields = ['name_en', 'name_ko']
    list_filter = ['source']


@admin.register(ModelGroup)
class ModelGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'name_en', 'name_ko', 'brand', 'code']
    list_filter = ['brand']
    search_fields = ['name_en', 'name_ko', 'brand__name_en']
    autocomplete_fields = ['brand']

    def get_search_results(self, request, queryset, search_term):
        """Учитывает ?brand=<id> — чтобы автокомплит группы в форме профиля
        импорта показывал только группы выбранной марки (см. import_profile.js)."""
        queryset, may_have_duplicates = super().get_search_results(request, queryset, search_term)
        brand_id = request.GET.get('brand')
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)
        return queryset, may_have_duplicates


@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name_en', 'name_ko', 'model_group', 'code']
    list_filter = ['model_group__brand']
    search_fields = ['name_en', 'name_ko', 'model_group__name_en']
    autocomplete_fields = ['model_group']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'first_name', 'last_name', 'role', 'telegram_id', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'telegram_id']
    list_editable = ['role']


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ['id', 'base', 'quote', 'rate', 'updated_at']
    readonly_fields = ['updated_at']


class CarPhotoInline(admin.TabularInline):
    model = CarPhoto
    extra = 0
    fields = ['image_number', 'path', 'category', 'ordering']
    ordering = ['image_number', 'ordering']


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand', 'model', 'year', 'price_krw', 'mileage', 'fuel_type', 'color',
                    'interior_color', 'region', 'sales_status', 'source', 'external_id', 'is_active']
    list_filter = ['source', 'is_active', 'sales_status', 'brand', 'fuel_type', 'year']
    search_fields = ['vin', 'external_id', 'vehicle_no', 'brand__name_en', 'model__name_en', 'badge']
    list_select_related = ['brand', 'model']
    autocomplete_fields = ['brand', 'model_group', 'model']
    inlines = [CarPhotoInline]
    readonly_fields = ['first_seen_at', 'last_seen_at', 'detail_fetched_at', 'source_metadata']


@admin.register(SearchRequest)
class SearchRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'brand', 'model_group', 'model', 'status', 'year_min', 'year_max',
                    'price_min', 'price_max', 'last_checked_at']
    list_filter = ['status', 'brand']
    search_fields = ['user__username', 'brand__name_en', 'model__name_en']
    autocomplete_fields = ['brand', 'model_group', 'model']


class ImportProfileForm(forms.ModelForm):
    """Форма профиля импорта с проверкой соответствия группы моделей марке."""
    class Meta:
        model = ImportProfile
        fields = '__all__'

    def clean(self):
        cleaned = super().clean()
        brand = cleaned.get('brand')
        group = cleaned.get('model_group')
        if group and brand and group.brand_id != brand.id:
            self.add_error(
                'model_group',
                'Группа моделей не принадлежит выбранной марке. '
                'Выберите группу этой марки или оставьте поле пустым (= все модели марки).'
            )
        return cleaned


@admin.register(ImportProfile)
class ImportProfileAdmin(admin.ModelAdmin):
    form = ImportProfileForm
    list_display = ['id', 'name', 'brand', 'model_group', 'is_active', 'page_size', 'max_pages',
                    'backfill_completed', 'last_run_at']
    list_filter = ['is_active', 'source', 'brand']
    search_fields = ['name', 'brand__name_en', 'model_group__name_en']
    autocomplete_fields = ['brand', 'model_group']
    readonly_fields = ['last_run_at', 'created_at', 'backfill_completed']
    actions = ['run_import', 'sync_catalog_action']

    class Media:
        # Фильтрует автокомплит «Группа моделей» по выбранной марке.
        js = ('cars/import_profile.js',)

    @admin.action(description='Запустить импорт выбранных профилей')
    def run_import(self, request, queryset):
        from .tasks import sync_encar_profile
        count = 0
        for profile in queryset:
            try:
                # Через Celery; если брокер недоступен — синхронно
                sync_encar_profile.delay(profile.id)
            except Exception:
                sync_encar_profile(profile.id)
            count += 1
        self.message_user(request, f'Запущен импорт {count} профиля(ей)', messages.SUCCESS)

    @admin.action(description='Синхронизировать каталог Encar (марки/группы/модели)')
    def sync_catalog_action(self, request, queryset):
        from .tasks import sync_catalog
        try:
            sync_catalog.delay()
        except Exception:
            sync_catalog()
        self.message_user(
            request,
            'Запущена синхронизация каталога Encar (марки, группы моделей и модели '
            'для отслеживаемых марок). Новые названия появятся после завершения.',
            messages.SUCCESS,
        )


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
    autocomplete_fields = ['car', 'user', 'manager']
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


@admin.register(ValueTranslation)
class ValueTranslationAdmin(admin.ModelAdmin):
    list_display = ['id', 'kind', 'source_value', 'name_ru', 'name_en', 'canonical', 'name_hex',
                    'auto', 'updated_at']
    list_filter = ['kind', 'auto']
    search_fields = ['source_value', 'name_ru', 'name_en']
    list_editable = ['name_ru', 'name_en', 'canonical', 'auto']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # ручная правка переводов должна сразу влиять на нормализацию
        from .encar.normalization import refresh_translation_cache
        refresh_translation_cache()
