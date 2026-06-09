from django.db import migrations, models


def migrate_data_from_advertisement_to_car(apps, schema_editor):
    Car = apps.get_model('cars', 'Car')
    Advertisement = apps.get_model('cars', 'Advertisement')

    for ad in Advertisement.objects.all():
        Car.objects.filter(pk=ad.car_id).update(
            price_krw=ad.price_krw,
            car_price=ad.car_price,
            mileage=ad.mileage,
            condition=ad.condition,
        )


def reverse_migrate_data(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cars', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='car',
            name='car_price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14, verbose_name='Цена (RUB)'),
        ),
        migrations.AddField(
            model_name='car',
            name='condition',
            field=models.TextField(blank=True, default='', verbose_name='Состояние автомобиля'),
        ),
        migrations.AddField(
            model_name='car',
            name='mileage',
            field=models.IntegerField(default=0, verbose_name='Пробег'),
        ),
        migrations.AddField(
            model_name='car',
            name='price_krw',
            field=models.BigIntegerField(blank=True, null=True, verbose_name='Цена (KRW, воны)'),
        ),
        migrations.RunPython(
            migrate_data_from_advertisement_to_car,
            reverse_code=reverse_migrate_data,
        ),
        migrations.RemoveField(
            model_name='car',
            name='model_group',
        ),
        migrations.DeleteModel(
            name='Advertisement',
        ),
    ]
