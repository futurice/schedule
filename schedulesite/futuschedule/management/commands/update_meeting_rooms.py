from django.core.management.base import BaseCommand
from django.conf import settings
from futuschedule import util

class Command(BaseCommand):
    help = 'Update meeting rooms'

    def handle(self, *args, **options):
        util.updateMeetingRooms()
