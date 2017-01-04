
from futuschedule.celery import app
from django.core import management

@app.task
def update_meeting_rooms():
    management.call_command('update_meeting_rooms')

@app.task
def refresh_users():
    management.call_command('refresh_users')
