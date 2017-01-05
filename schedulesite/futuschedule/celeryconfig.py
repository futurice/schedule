from __future__ import absolute_import
from celery.schedules import crontab
from kombu.serialization import register
from datetime import timedelta
import os
from futuschedule import tasks

from futuschedule.myjson import my_dumps, my_loads

register('myjson', my_dumps, my_loads,
    content_type='application/x-myjson',
    content_encoding='utf-8')

BROKER_URL = os.getenv('BROKER_URL', "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv('RESULT_BACKEND', "redis://127.0.0.1/0")

CELERYD_PREFETCH_MULTIPLIER = 6
CELERY_ACCEPT_CONTENT = ['myjson']
CELERY_TASK_SERIALIZER = 'myjson'
CELERY_RESULT_SERIALIZER = CELERY_TASK_SERIALIZER
CELERY_ACCEPT_CONTENT = [CELERY_TASK_SERIALIZER, ]

CELERY_IMPORTS=('futuschedule.tasksched_tasks')

CELERYBEAT_SCHEDULE = {
    'refresh-users': {
        'task': 'futuschedule.tasks.refresh_users',
        'schedule': crontab(minute=0),
    },
    'update-meeting-rooms': {
        'task': 'futuschedule.tasks.update_meeting_rooms',
        'schedule': crontab(minute=0),
    }
}


# Celery ONCE settings
ONCE_REDIS_URL = BROKER_URL
ONCE_DEFAULT_TIMEOUT = 60