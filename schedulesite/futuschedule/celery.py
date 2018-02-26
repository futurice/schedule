from __future__ import absolute_import
from celery import Celery
from django.conf import settings
import os

# https://docs.getsentry.com/hosted/clients/python/integrations/celery/
import raven
from raven.contrib.celery import register_signal, register_logger_signal
class Celery(Celery):
    def on_configure(self):
        client = raven.Client(settings.RAVEN_CONFIG['dsn'])
        register_logger_signal(client)
        register_signal(client)

app = Celery('schedule')
app.config_from_object(os.getenv("CELERY_CONFIG_MODULE", 'futuschedule.celeryconfig'))
