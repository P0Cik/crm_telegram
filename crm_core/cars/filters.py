"""
FilterSet каталога автомобилей (django-filter).

Поддерживает фильтры фронтенда (по марке/группе/модели, году, цене в RUB,
пробегу, топливу, цвету, кузову и т.д.). Цена хранится в вонах, поэтому фильтры
по цене в рублях конвертируются в воны по текущему курсу.
"""
import django_filters as df

from .models import Car
from .currency import rub_to_krw


class CarFilter(df.FilterSet):
    brand = df.NumberFilter(field_name='brand_id')
    brand_name = df.CharFilter(field_name='brand__name_en', lookup_expr='iexact')
    model_group = df.NumberFilter(field_name='model_group_id')
    model_group_name = df.CharFilter(field_name='model_group__name_ko', lookup_expr='iexact')
    model = df.NumberFilter(field_name='model_id')
    model_name = df.CharFilter(field_name='model__name_en', lookup_expr='icontains')

    year_min = df.NumberFilter(field_name='year', lookup_expr='gte')
    year_max = df.NumberFilter(field_name='year', lookup_expr='lte')

    # Цена приходит в рублях, в БД хранится в вонах -> конвертируем порог.
    price_min = df.NumberFilter(method='filter_price_min')
    price_max = df.NumberFilter(method='filter_price_max')

    mileage_min = df.NumberFilter(field_name='mileage', lookup_expr='gte')
    mileage_max = df.NumberFilter(field_name='mileage', lookup_expr='lte')

    fuel_type = df.CharFilter(field_name='fuel_type', lookup_expr='iexact')
    transmission = df.CharFilter(field_name='transmission', lookup_expr='icontains')
    body_type = df.CharFilter(field_name='body_type', lookup_expr='icontains')
    color = df.CharFilter(field_name='color', lookup_expr='icontains')
    region = df.CharFilter(field_name='region', lookup_expr='icontains')
    sales_status = df.CharFilter(field_name='sales_status', lookup_expr='iexact')

    class Meta:
        model = Car
        fields = ['source', 'is_active', 'brand', 'model_group', 'model', 'fuel_type', 'sales_status']

    def filter_price_min(self, queryset, name, value):
        krw = rub_to_krw(value)
        return queryset.filter(price_krw__gte=krw) if krw is not None else queryset

    def filter_price_max(self, queryset, name, value):
        krw = rub_to_krw(value)
        return queryset.filter(price_krw__lte=krw) if krw is not None else queryset
