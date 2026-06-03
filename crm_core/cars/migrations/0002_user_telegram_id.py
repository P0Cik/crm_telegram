from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cars', '0001_initial'),  # Замените на имя последней миграции
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='telegram_id',
            field=models.BigIntegerField(blank=True, help_text='Уникальный ID пользователя в Telegram', null=True, unique=True, verbose_name='Telegram ID'),
        ),
    ]
