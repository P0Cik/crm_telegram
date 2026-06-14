"""
Выгружает собранный каталог (марки -> группы -> модели) и словарь переводов
значений в Django-фикстуры cars/fixtures/. Запускать ПОСЛЕ первого реального
сбора (sync_catalog), чтобы зафиксировать данные для демонстрации/тестов офлайн.

    python manage.py dump_catalog_fixtures

Загрузить обратно:
    python manage.py loaddata catalog value_translations
"""
from pathlib import Path

from django.conf import settings
from django.core import serializers
from django.core.management.base import BaseCommand

from cars.models import Brand, ModelGroup, Model, ValueTranslation


class Command(BaseCommand):
    help = 'Выгружает каталог и переводы значений в фикстуры cars/fixtures/.'

    def handle(self, *args, **options):
        out_dir = Path(settings.BASE_DIR) / 'cars' / 'fixtures'
        out_dir.mkdir(parents=True, exist_ok=True)

        groups = [
            ('catalog.json', [Brand, ModelGroup, Model]),
            ('value_translations.json', [ValueTranslation]),
        ]
        for fname, model_classes in groups:
            objs = []
            for model_cls in model_classes:
                objs.extend(model_cls.objects.all().order_by('pk'))
            data = serializers.serialize('json', objs, indent=2)
            path = out_dir / fname
            path.write_text(data, encoding='utf-8')
            self.stdout.write(self.style.SUCCESS(f'{fname}: {len(objs)} записей -> {path}'))

        self.stdout.write(self.style.SUCCESS(
            'Готово. Загрузить: python manage.py loaddata catalog value_translations'
        ))
