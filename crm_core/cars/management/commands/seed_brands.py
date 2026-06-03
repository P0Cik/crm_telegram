from django.core.management.base import BaseCommand
from cars.models import Brand, Model


class Command(BaseCommand):
    help = 'Заполняет базу данных брендами и моделями автомобилей'

    def handle(self, *args, **options):
        # Данные о брендах и моделях из SubscriptionsManager.tsx
        POPULAR_BRANDS_MODELS = {
            'BMW': ['1-series', '3-series', '5-series', 'X5', 'X7'],
            'Audi': ['A3', 'A4', 'A6', 'Q5'],
            'Chevrolet': ['Bolt', 'Captiva', 'Trailblazer'],
            'Ford': ['Explorer', 'Mustang', 'Ranger'],
            'Geely': ['Coolray', 'Monjaro', 'Tugella']
        }

        self.stdout.write(self.style.SUCCESS('Начало заполнения базы данных брендами и моделями...'))

        for brand_name, models in POPULAR_BRANDS_MODELS.items():
            # Создаем или получаем бренд
            brand, created = Brand.objects.get_or_create(name=brand_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Создан бренд: {brand_name}'))
            else:
                self.stdout.write(f'  Бренд уже существует: {brand_name}')

            # Создаем модели для бренда
            for model_name in models:
                model, created = Model.objects.get_or_create(
                    brand=brand,
                    name=model_name
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Создана модель: {model_name}'))
                else:
                    self.stdout.write(f'    Модель уже существует: {model_name}')

        self.stdout.write(self.style.SUCCESS('\n=== Статистика ==='))
        self.stdout.write(self.style.SUCCESS(f'Всего брендов: {Brand.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Всего моделей: {Model.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('\nГотово!'))
