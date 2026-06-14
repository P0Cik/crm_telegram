from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cars', '0001_initial'),
    ]

    operations = [
        # --- П.1: убираем русский перевод у справочника каталога ---
        migrations.RemoveField(model_name='brand', name='name_ru'),
        migrations.RemoveField(model_name='modelgroup', name='name_ru'),
        migrations.RemoveField(model_name='model', name='name_ru'),

        # --- Рынок профиля импорта (импорт / внутренний / все) ---
        migrations.AddField(
            model_name='importprofile',
            name='car_type',
            field=models.CharField(
                choices=[('N', 'Импортные (ввезённые в Корею)'),
                         ('Y', 'Внутренний рынок Кореи'), ('A', 'Все')],
                default='N',
                help_text='Какие авто тянуть: импортные, внутренний рынок Кореи или все',
                max_length=1, verbose_name='Рынок'),
        ),

        # --- П.3: БД-словарь переводов значений-перечислений ---
        migrations.CreateModel(
            name='ValueTranslation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(
                    choices=[('fuel', 'Топливо'), ('transmission', 'Коробка передач'),
                             ('body_type', 'Тип кузова'), ('color', 'Цвет'),
                             ('region', 'Регион'), ('brand', 'Марка')],
                    db_index=True, max_length=20, verbose_name='Тип значения')),
                ('source_value', models.CharField(max_length=255, verbose_name='Исходное значение (источник)')),
                ('name_ru', models.CharField(blank=True, default='', max_length=255, verbose_name='Перевод (RU)')),
                ('name_en', models.CharField(blank=True, default='', max_length=255, verbose_name='Перевод (EN)')),
                ('auto', models.BooleanField(
                    default=False,
                    help_text='Снимите галочку при ручной правке, чтобы автоперевод не перезаписывал значение',
                    verbose_name='Автоперевод')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлён')),
            ],
            options={
                'verbose_name': 'Перевод значения',
                'verbose_name_plural': 'Переводы значений',
                'ordering': ['kind', 'source_value'],
                'unique_together': {('kind', 'source_value')},
            },
        ),
    ]
