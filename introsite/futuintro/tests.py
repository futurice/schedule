import datetime
import dateutil.parser
import json
import pytz
from django.test import TestCase
from futuintro import calendar, util, testutil

class DummyTest(TestCase):

    def test_create_and_delete_event(self):
        calId = calendar.futuintroCalId
        tzName = calendar.berlinTz

        startDt = datetime.datetime.today() + datetime.timedelta(days=1)
        startDt = datetime.datetime(startDt.year, startDt.month, startDt.day,
                9, 45)
        endDt = startDt + datetime.timedelta(minutes=30)
        attendingEmails = [testutil.Alice_email, testutil.Brad_email]
        ev = calendar.createEvent(calId, False, 'TEST: sample event',
                'Test: create & delete a simple event', 'Reception',
                startDt, endDt, tzName, attendingEmails)

        def parseToTimezone(string, tz):
            """Parse a datetime string and convert it to timezone tz."""
            return dateutil.parser.parse(string).astimezone(tz)

        def sameLocalFields(dt1, dt2):
            """Compare year, month, day, hour, minute and second in args."""
            return (dt1.year == dt2.year and dt1.month == dt2.month
                    and dt1.day == dt2.day and dt1.hour == dt2.hour
                    and dt1.minute == dt2.minute and dt1.second == dt2.second)

        print(json.dumps(ev, indent=2))
        # Google returns an ISO dateTime string which includes a UTC offset
        # (apparently the local offset for you). Convert to local time for the
        # timezone we requested above, and check the date&time.
        tzObj = pytz.timezone(tzName)
        self.assertTrue(sameLocalFields(startDt,
            parseToTimezone(ev['start']['dateTime'], tzObj)))
        self.assertTrue(sameLocalFields(endDt,
            parseToTimezone(ev['end']['dateTime'], tzObj)))

        self.assertTrue({x for x in attendingEmails}
                == {x['email'] for x in ev['attendees']})

        #calendar.deleteEvent(calId, ev['id'])
