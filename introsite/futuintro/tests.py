from django.test import TestCase
from futuintro import util
import json

class DummyTest(TestCase):

    def test_dummy(self):
        calSvc = util.buildCalendarSvc()

        event = {
                'summary': 'A Test event',
                'location': 'Kitchen',
                'start': {
                    'dateTime': '2014-05-13T09:00:00.000+03:00',
                },
                'end': {
                    'dateTime': '2014-05-13T09:30:00.000+03:00',
                },
                'attendees': [
                    {
                        'email': 'user.name@futurice.com',
                    },
                ],
        }

        # TODO: make a "Futurice Onboardings" Calendar and use its ID here,
        # we're now putting this on the developer's own calendar when he/she
        # runs this test.
        createdEvent = calSvc.events().insert(
                calendarId='primary', body=event).execute()
        evId = createdEvent['id']

        retrievedEvent = calSvc.events().get(
                calendarId='primary', eventId=evId).execute()
        print(json.dumps(retrievedEvent, indent=2))

        # TODO: check something useful, e.g. the attendees' emails
        self.assertEqual(retrievedEvent['id'], createdEvent['id'])
