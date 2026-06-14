"""
Ручная синхронизация каталога Encar (марки -> группы моделей -> модели) из inav.
Запускается синхронно (без celery-воркера), удобно для первичного наполнения.

    python manage.py sync_catalog            # группы для всех марок, модели — для отслеживаемых
    python manage.py sync_catalog --deep     # модели для всех марок (много запросов)
    python manage.py sync_catalog --no-translate
"""
from django.core.management.base import BaseCommand

from cars.tasks import sync_catalog, auto_translate_unmapped


class Command(BaseCommand):
    help = 'Синхронизирует каталог Encar (марки/группы/модели) из inav, синхронно.'

    def add_arguments(self, parser):
        parser.add_argument('--deep', action='store_true',
                            help='Тянуть модели для всех марок, а не только отслеживаемых')
        parser.add_argument('--no-translate', action='store_true',
                            help='Не запускать автоперевод после синхронизации')

    def handle(self, *args, **options):
        self.stdout.write('Синхронизация каталога Encar (это может занять несколько минут)...')
        # do_translate=False — перевод запустим сами, синхронно, ниже.
        totals = sync_catalog(deep=options['deep'], do_translate=False)
        self.stdout.write(self.style.SUCCESS(
            f"Каталог: марок {totals['brands']}, групп {totals['groups']}, моделей {totals['models']}"
        ))

        if not options['no_translate']:
            self.stdout.write('Автоперевод недостающих названий и значений...')
            res = auto_translate_unmapped()
            self.stdout.write(self.style.SUCCESS(
                f"Переводы: значений {res['translated']}, обновлено авто {res['cars_updated']}, "
                f"каталог {res['catalog_filled']}"
            ))
        self.stdout.write(self.style.SUCCESS('Готово.'))
