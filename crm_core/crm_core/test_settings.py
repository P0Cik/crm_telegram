"""
Тестовые настройки ТОЛЬКО для прогона на сборках Python без JSON1 в SQLite
(напр. Windows Python 3.8). Регистрируют недостающую функцию JSON_VALID как
Python-реализацию, чтобы CHECK-констрейнты JSONField не падали.

Запуск:  python manage.py test cars --settings=crm_core.test_settings
На рабочем окружении (Python 3.10+/Postgres) НЕ нужны — используйте обычные настройки.
"""
import os

os.environ.setdefault('USE_SQLITE', '1')

from crm_core.settings import *  # noqa: F401,F403

# На сборках без JSON1 Django помечает JSONField как неподдерживаемый (E180);
# хранение/чтение работает (сериализация в Python), поэтому для тестов глушим.
SILENCED_SYSTEM_CHECKS = ['fields.E180']

import json as _json
from django.db.backends.signals import connection_created


def _register_sqlite_json(sender, connection, **kwargs):
    if connection.vendor != 'sqlite':
        return

    def json_valid(value):
        if value is None:
            return 1
        try:
            _json.loads(value)
            return 1
        except Exception:
            return 0

    try:
        connection.connection.create_function('JSON_VALID', 1, json_valid)
    except Exception:
        pass


connection_created.connect(_register_sqlite_json)
