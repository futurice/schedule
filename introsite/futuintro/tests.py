import datetime
import dateutil.parser
import json
import pytz

from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase

from futuintro import calendar, util, testutil
from futuintro import models, tasksched


class GoogleCalendarTest(TestCase):

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

        calendar.deleteEvent(calId, ev['id'])


class ForeignKeyDeleteTest(TestCase):
    """
    Test what happens when we delete objects involved in relationships.
    """

    def testDeleteSupervisor(self):
        UM = get_user_model()

        # one way to create & save objects
        fry = UM(username='fry', email='fry@futu', first_name='Phillip J.',
                last_name='Fry')
        fry.save()

        # alternative way to create & save objects
        leela = UM.objects.create(username='leela', email='leela@futu',
                first_name='Leela', last_name='Turanga')

        prof = UM(username='farnsworth', email='farnsworth@futu',
                first_name='Hubert J.', last_name='Farnsworth')
        prof.save()

        # one way to add foreign key (directly)
        fry.supervisor = prof
        fry.save()

        # another way to add foreign key (the reverse relationship's Manager)
        prof.supervisor_of.add(leela)

        self.assertIs(prof.supervisor_of.count(), 2)
        leela.delete()
        self.assertIs(prof.supervisor_of.count(), 1)

        prof.delete()
        self.assertIsNone(UM.objects.get(username='fry').supervisor)

    def testDeleteTimezoneUsedByScheduleTemplate(self):
        stras = models.TimeZone(name='Europe/Brussels')
        stras.save()
        damascus = models.TimeZone(name='Asia/Damascus')
        damascus.save()

        schedTempl = models.ScheduleTemplate(name='My SchedTempl',
                timezone=stras)
        schedTempl.save()

        damascus.delete()
        with self.assertRaises(ProtectedError):
            stras.delete()
        schedTempl.delete()

    def testDeleteScheduleTemplateDeletesEventTemplates(self):
        tz = models.TimeZone.objects.create(name='Europe/Helsinki')
        schedTempl = models.ScheduleTemplate.objects.create(name='My SchedT',
                timezone=tz)
        nowT = datetime.datetime.now().time()
        et = models.EventTemplate.objects.create(dayOffset=0,
                startTime=nowT, endTime=nowT, scheduleTemplate=schedTempl)
        etId = et.id
        self.assertIs(models.EventTemplate.objects.filter(id=etId).count(), 1)
        schedTempl.delete()
        self.assertIs(models.EventTemplate.objects.filter(id=etId).count(), 0)

    def testCanDeleteRoomUsedByEventTemplate(self):
        tz = models.TimeZone.objects.create(name='Europe/Helsinki')
        schedTempl = models.ScheduleTemplate.objects.create(name='My SchedT',
                timezone=tz)
        room = models.CalendarResource.objects.create(name='basement')
        nowT = datetime.datetime.now().time()
        et = models.EventTemplate.objects.create(dayOffset=0,
                startTime=nowT, endTime=nowT, scheduleTemplate=schedTempl)
        et.locations.add(room)
        room.delete()
        self.assertIs(len(et.locations.all()), 0)

    def testDeleteUserInvitedToEventTemplate(self):
        tz = models.TimeZone.objects.create(name='Europe/Helsinki')
        schedTempl = models.ScheduleTemplate.objects.create(name='My SchedT',
                timezone=tz)
        nowT = datetime.datetime.now().time()
        et = models.EventTemplate.objects.create(dayOffset=0,
                startTime=nowT, endTime=nowT, scheduleTemplate=schedTempl)

        UM = get_user_model()
        bender = UM.objects.create(username='bender', email='bender@futu')
        calculon = UM.objects.create(username='calculon', email='calculon@futu')
        et.otherInvitees.add(bender, calculon)

        calculon.delete()
        self.assertIs(et.otherInvitees.count(), 1)
        self.assertIs(UM.objects.filter(username='bender').count(), 1)
        self.assertIs(UM.objects.filter(username='calculon').count(), 0)


class ApiCallsRateLimits(TestCase):

    def testCallsOneSecondApart(self):
        # If this test fails, set minDelta to 0.8 seconds or so.
        minDelta = datetime.timedelta(seconds=1)

        tasksched.sleepForRateLimit()
        lastDt = datetime.datetime.utcnow()
        lastDb = models.LastApiCall.objects.get().dt

        for i in range(1):
            tasksched.sleepForRateLimit()
            nowDt = datetime.datetime.utcnow()
            nowDb = models.LastApiCall.objects.get().dt

            self.assertTrue(nowDt-lastDt >= minDelta)
            self.assertTrue(nowDb-lastDb >= minDelta)

            lastDt, lastDb = nowDt, nowDb
