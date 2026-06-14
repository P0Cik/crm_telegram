"""
Ручной запуск автоперевода новых значений-перечислений и названий каталога
(топливо/КПП/кузов/цвет/регион + name_en марок/групп/моделей), синхронно.

    python manage.py translate_values
"""
from django.core.management.base import BaseCommand

from cars.tasks import auto_translate_unmapped
from cars.encar import translate


class Command(BaseCommand):
    help = 'Переводит значения и названия, не покрытые статическими словарями (deep-translator).'

    def handle(self, *args, **options):
        if not translate.translator_available():
            self.stdout.write(self.style.WARNING(
                'deep-translator не установлен или недоступен — непереведённые значения '
                'будут лишь помечены как «ожидающие» (видны в админке /admin/cars/valuetranslation/).'
            ))
        res = auto_translate_unmapped()
        self.stdout.write(self.style.SUCCESS(
            f"Переведено значений: {res['translated']}, обновлено авто: {res['cars_updated']}, "
            f"заполнено в каталоге: {res['catalog_filled']}"
        ))
