from __future__ import absolute_import
from celery import Celery
from django.conf import settings
import os

app = Celery('schedule')
app.config_from_object(os.getenv("CELERY_CONFIG_MODULE", 'futuschedule.celeryconfig'))
