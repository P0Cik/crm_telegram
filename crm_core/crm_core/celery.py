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
    'check-new-advertisements-every-hour': {
        'task': 'cars.tasks.check_new_advertisements',
        'schedule': crontab(minute=0, hour='*'),  # Каждый час
    },
    'update-exchange-rates-daily': {
        'task': 'cars.tasks.update_exchange_rates',
        'schedule': crontab(minute=0, hour=9),  # Каждый день в 9:00
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
