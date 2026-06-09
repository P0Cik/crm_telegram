"""
FilterSet каталога автомобилей (django-filter).

Поддерживает фильтры, которые шлёт фронтенд (по марке/модели, году, цене в RUB,
пробегу, топливу, цвету и т.д.). Цена и пробег берутся из связанного активного
объявления.
"""
import django_filters as df

from .models import Car


class CarFilter(df.FilterSet):
    brand = df.NumberFilter(field_name='brand_id')
    brand_name = df.CharFilter(field_name='brand__name', lookup_expr='iexact')
    model = df.NumberFilter(field_name='model_id')
    model_name = df.CharFilter(field_name='model__name', lookup_expr='icontains')
    model_group = df.CharFilter(field_name='model_group', lookup_expr='iexact')

    year_min = df.NumberFilter(field_name='year', lookup_expr='gte')
    year_max = df.NumberFilter(field_name='year', lookup_expr='lte')

    price_min = df.NumberFilter(method='filter_price_min')
    price_max = df.NumberFilter(method='filter_price_max')
    mileage_min = df.NumberFilter(method='filter_mileage_min')
    mileage_max = df.NumberFilter(method='filter_mileage_max')

    fuel_type = df.CharFilter(field_name='fuel_type', lookup_expr='iexact')
    transmission = df.CharFilter(field_name='transmission', lookup_expr='icontains')
    steering_wheel = df.CharFilter(field_name='steering_wheel', lookup_expr='iexact')
    drive_type = df.CharFilter(field_name='drive_type', lookup_expr='icontains')
    color = df.CharFilter(field_name='color', lookup_expr='icontains')
    region = df.CharFilter(field_name='region', lookup_expr='icontains')

    class Meta:
        model = Car
        fields = ['source', 'is_active', 'brand', 'model', 'fuel_type']

    def filter_price_min(self, queryset, name, value):
        return queryset.filter(advertisements__is_active=True,
                               advertisements__car_price__gte=value).distinct()

    def filter_price_max(self, queryset, name, value):
        return queryset.filter(advertisements__is_active=True,
                               advertisements__car_price__lte=value).distinct()

    def filter_mileage_min(self, queryset, name, value):
        return queryset.filter(advertisements__is_active=True,
                               advertisements__mileage__gte=value).distinct()

    def filter_mileage_max(self, queryset, name, value):
        return queryset.filter(advertisements__is_active=True,
                               advertisements__mileage__lte=value).distinct()
