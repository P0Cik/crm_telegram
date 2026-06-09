"""
Импорт автомобилей из локальных фикстур-примеров Encar (демо без обращения к сети).

Использует тот же слой синхронизации, что и реальный сбор:
  * mobile_example.json   — список объявлений -> Car + Advertisement + фото;
  * vehicle_example.json  — детальная карточка -> обогащение Car;
  * vehicles_example.json — массив детальных карточек -> обогащение.
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from cars.encar import mapper, sync
from cars.models import Car

FIXTURES_DIR = Path(settings.BASE_DIR) / 'cars' / 'fixtures'


class Command(BaseCommand):
    help = 'Импортирует автомобили из локальных фикстур Encar (демо-данные)'

    def add_arguments(self, parser):
        parser.add_argument('--dir', type=str, default=str(FIXTURES_DIR),
                            help='Папка с фикстурами JSON')

    def _load(self, path: Path):
        if not path.exists():
            self.stdout.write(self.style.WARNING(f'  файл не найден: {path}'))
            return None
        with open(path, encoding='utf-8') as f:
            return json.load(f)

    def handle(self, *args, **options):
        base = Path(options['dir'])
        created = updated = 0

        # 1) Список объявлений
        listing = self._load(base / 'mobile_example.json')
        if listing:
            for item in listing.get('SearchResults', []):
                parsed = mapper.parse_list_item(item)
                if not parsed:
                    continue  # дубликат (ServiceCopyCar != ORIGINAL)
                car, was_created = sync.upsert_from_list(parsed)
                created += int(was_created)
                updated += int(not was_created)
            self.stdout.write(self.style.SUCCESS(
                f'Список: создано {created}, обновлено {updated}'
            ))

        # 2) Детальная карточка (одна)
        detail = self._load(base / 'vehicle_example.json')
        details = []
        if detail:
            details.append(detail)

        # 3) Массив детальных карточек
        many = self._load(base / 'vehicles_example.json')
        if many:
            if isinstance(many, list):
                details.extend(many)
            elif isinstance(many, dict):
                details.extend(many.get('vehicles', []) or [])

        enriched = 0
        for vehicle in details:
            parsed = mapper.parse_detail(vehicle)
            ext_id = parsed.get('external_id')
            if not ext_id:
                continue
            car, was_created = Car.objects.get_or_create(
                source='encar', external_id=ext_id,
                defaults={'year': parsed.get('year') or 0, 'is_active': True},
            )
            created += int(was_created)
            sync.apply_detail(car, parsed)
            enriched += 1

        self.stdout.write(self.style.SUCCESS(f'Обогащено деталей: {enriched}'))
        self.stdout.write(self.style.SUCCESS(
            f'\nИтого автомобилей в БД: {Car.objects.count()} '
            f'(активных: {Car.objects.filter(is_active=True).count()})'
        ))
