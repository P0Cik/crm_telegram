"""
Заполнение справочников марок/моделей реальными значениями Encar из inav-фикстуры
(faceted-навигация). Также создаёт демонстрационные профили сбора (SearchProfile).

inav содержит:
  * Manufacturer — список марок (제조사);
  * ModelGroup    — группы моделей выбранной марки;
  * Model         — полные названия моделей (напр. "X5 (G05)").
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from cars.encar import normalization as norm
from cars.models import Brand, Model, SearchProfile

INAV_CANDIDATES = [
    Path(settings.BASE_DIR) / 'cars' / 'fixtures' / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent / 'mobile_example_inav.json',
    Path(settings.BASE_DIR).parent.parent / 'mobile_example_inav.json',
]


def _collect_facets(nodes, name):
    """Рекурсивно собирает Value всех фасетов узла с заданным Name."""
    found = []
    for node in nodes:
        if node.get('Name') == name:
            for f in node.get('Facets', []):
                v = f.get('Value')
                if v:
                    found.append(v)
        for f in node.get('Facets', []):
            ref = f.get('Refinements')
            if ref:
                found.extend(_collect_facets(ref.get('Nodes', []), name))
    return found


class Command(BaseCommand):
    help = 'Заполняет марки/модели из inav-фикстуры Encar и создаёт профили сбора'

    def _load_inav(self):
        for p in INAV_CANDIDATES:
            if p.exists():
                with open(p, encoding='utf-8') as f:
                    return json.load(f)
        return None

    def handle(self, *args, **options):
        data = self._load_inav()

        if data:
            nodes = data.get('iNav', {}).get('Nodes', [])
            manufacturers = _collect_facets(nodes, 'Manufacturer')
            model_groups = _collect_facets(nodes, 'ModelGroup')
            models = _collect_facets(nodes, 'Model')
            self.stdout.write(self.style.SUCCESS(
                f'inav: марок {len(manufacturers)}, групп {len(model_groups)}, моделей {len(models)}'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                'inav-фикстура не найдена — использую базовый набор'
            ))
            manufacturers = ['BMW', '벤츠', '아우디', '도요타', '렉서스']
            model_groups = []
            models = ['X5 (G05)', 'X5 (F15)', '5시리즈 (G60)', '3시리즈 (G20)']

        # Марки
        for name in manufacturers:
            ru, en = norm.normalize_brand(name)
            Brand.objects.get_or_create(name=name, defaults={'name_ru': ru, 'name_en': en})

        # Модели Encar (полные названия) и группы — привязываем к BMW
        # (в нашей фикстуре inav отфильтрован по BMW; при реальном синке модели
        #  остальных марок создаются автоматически).
        bmw, _ = Brand.objects.get_or_create(name='BMW', defaults={'name_ru': 'BMW', 'name_en': 'BMW'})
        for name in set(models):
            group = name.split(' ')[0] if name else ''
            Model.objects.get_or_create(brand=bmw, name=name, defaults={'model_group': group})
        # Группы как самостоятельные модели верхнего уровня (для подписок без детализации)
        for group in set(model_groups):
            Model.objects.get_or_create(brand=bmw, name=group, defaults={'model_group': group})

        # Демонстрационные профили сбора
        demo_profiles = [
            {'name': 'BMW X5', 'manufacturer': 'BMW', 'model_group': 'X5'},
            {'name': 'BMW 5 серия', 'manufacturer': 'BMW', 'model_group': '5시리즈'},
        ]
        for p in demo_profiles:
            SearchProfile.objects.get_or_create(
                name=p['name'],
                defaults={
                    'manufacturer': p['manufacturer'],
                    'model_group': p['model_group'],
                    'is_active': True,
                    'max_pages': 2,
                },
            )

        self.stdout.write(self.style.SUCCESS('\n=== Статистика ==='))
        self.stdout.write(self.style.SUCCESS(f'Марок: {Brand.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Моделей: {Model.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Профилей сбора: {SearchProfile.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('Готово!'))
