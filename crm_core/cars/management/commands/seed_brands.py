"""
Первичное наполнение справочника Brand -> ModelGroup -> Model и демо-профилей
импорта.

Приоритет источника каталога:
  1) готовые фикстуры cars/fixtures/catalog.json и value_translations.json
     (созданы командой dump_catalog_fixtures после реального sync_catalog) —
     загружаются как есть;
  2) иначе — inav-фикстура mobile_example_inav.json (полное дерево для BMW).

Полный каталог по всем маркам собирается отдельно: python manage.py sync_catalog
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from cars.encar import catalog
from cars.models import Brand, ModelGroup, Model, ImportProfile, ValueTranslation

FIXTURES_DIR = Path(settings.BASE_DIR) / 'cars' / 'fixtures'

INAV_CANDIDATES = [
    FIXTURES_DIR / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent.parent / 'mobile_example_inav.json',
]


class Command(BaseCommand):
    help = 'Наполняет каталог (из фикстур или inav) и создаёт демо-профили импорта'

    def _load_inav(self):
        for p in INAV_CANDIDATES:
            if p.exists():
                with open(p, encoding='utf-8') as f:
                    return json.load(f)
        return None

    def handle(self, *args, **options):
        catalog_fixture = FIXTURES_DIR / 'catalog.json'
        translations_fixture = FIXTURES_DIR / 'value_translations.json'

        if catalog_fixture.exists():
            call_command('loaddata', 'catalog')
            self.stdout.write(self.style.SUCCESS('Каталог загружен из фикстуры catalog.json'))
            if translations_fixture.exists():
                call_command('loaddata', 'value_translations')
                self.stdout.write(self.style.SUCCESS(
                    'Переводы значений загружены из value_translations.json'))
        else:
            data = self._load_inav()
            if data:
                stats = catalog.upsert_catalog_from_inav(data.get('iNav', {}))
                self.stdout.write(self.style.SUCCESS(
                    f"inav: марок +{stats['brands']}, групп +{stats['groups']}, моделей +{stats['models']}"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    'Нет ни фикстуры catalog.json, ни inav — каталог не загружен. '
                    'Запустите: python manage.py sync_catalog'
                ))

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
        self.stdout.write(self.style.SUCCESS(f'Переводов значений: {ValueTranslation.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Профилей импорта: {ImportProfile.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('Готово!'))
