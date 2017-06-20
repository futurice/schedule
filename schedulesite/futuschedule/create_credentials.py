import datetime
from futuschedule importncalendar
from django.conf import settings

# This should be run only once to create the credentials to database
# the script does a simple calendar api call to trigger the authorization process

def run():
  calId = settings.TEST_CALENDAR_ID
  tzName = 'Europe/Berlin'

  eventStart = datetime.datetime(2016, 11, 26, 9, 0)
  eventEnd = eventStart + datetime.timedelta(hours=1)

  calendar.isOccupied(calId, eventStart, eventEnd, tzName)
