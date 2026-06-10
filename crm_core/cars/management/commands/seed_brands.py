"""
Заполнение справочника Brand -> ModelGroup -> Model из inav-фикстуры Encar
(faceted-навигация) и создание демонстрационных профилей импорта.

inav раскрывает дерево моделей только для запрошенной марки, поэтому в фикстуре
полное дерево есть для BMW; остальные марки заводятся как минимум на верхнем
уровне, а их модели дозаполняются при реальном импорте/sync_catalog.
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from cars.encar import catalog
from cars.models import Brand, ModelGroup, Model, ImportProfile

INAV_CANDIDATES = [
    Path(settings.BASE_DIR) / 'cars' / 'fixtures' / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent.parent / 'mobile_example_inav.json',
]


class Command(BaseCommand):
    help = 'Заполняет справочник из inav-фикстуры Encar и создаёт демо-профили импорта'

    def _load_inav(self):
        for p in INAV_CANDIDATES:
            if p.exists():
                with open(p, encoding='utf-8') as f:
                    return json.load(f)
        return None

    def handle(self, *args, **options):
        data = self._load_inav()

        if data:
            inav = data.get('iNav', {})
            stats = catalog.upsert_catalog_from_inav(inav)
            self.stdout.write(self.style.SUCCESS(
                f"inav: марок +{stats['brands']}, групп +{stats['groups']}, моделей +{stats['models']}"
            ))
        else:
            self.stdout.write(self.style.WARNING('inav-фикстура не найдена — пропуск загрузки каталога'))

        # Демонстрационные профили импорта (на FK марки/группы)
        demo = [('BMW X5', 'BMW', 'X5'), ('BMW 5 серия', 'BMW', '5시리즈')]
        created_profiles = 0
        for name, brand_ko, group_ko in demo:
            brand = Brand.objects.filter(name_ko=brand_ko).first()
            if not brand:
                continue
            group = ModelGroup.objects.filter(brand=brand, name_ko=group_ko).first()
            _, was_created = ImportProfile.objects.get_or_create(
                name=name,
                defaults={'brand': brand, 'model_group': group, 'is_active': True,
                          'page_size': 100, 'max_pages': 5},
            )
            created_profiles += int(was_created)

        self.stdout.write(self.style.SUCCESS('\n=== Статистика ==='))
        self.stdout.write(self.style.SUCCESS(f'Марок: {Brand.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Групп моделей: {ModelGroup.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Моделей: {Model.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Профилей импорта: {ImportProfile.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('Готово!'))
