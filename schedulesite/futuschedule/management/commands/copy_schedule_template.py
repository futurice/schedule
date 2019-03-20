from django.core.management.base import BaseCommand
from django.conf import settings
from futuschedule import util

class Command(BaseCommand):
    help = 'Update meeting rooms'

    def add_arguments(self, parser):
        parser.add_argument('templateid', type=int, help='Schedule Template Id to copy')
        parser.add_argument('newname', type=str, help='Name for the copied tamplate')

    def handle(self, *args, **options):
        templateId = options['templateid']
        newName = options['newname']
        util.copyScheduleTemplate(templateId, newName)
