import os
from celery import Celery
from celery.schedules import crontab

# Установка переменной окружения для Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_core.settings')

app = Celery('crm_core')

# Загрузка конфигурации из Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматическое обнаружение задач в приложениях
app.autodiscover_tasks()

# Периодические задачи
app.conf.beat_schedule = {
    'run-import-profiles-every-30-min': {
        'task': 'cars.tasks.run_all_import_profiles',
        'schedule': crontab(minute='*/30'),  # каждые 30 минут
    },
    'sync-catalog-daily': {
        'task': 'cars.tasks.sync_catalog',
        'schedule': crontab(minute=30, hour=8),  # каждый день в 8:30
    },
    'update-exchange-rates-daily': {
        'task': 'cars.tasks.update_exchange_rates',
        'schedule': crontab(minute=0, hour=9),  # каждый день в 9:00
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
