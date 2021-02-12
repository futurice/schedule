import datetime
from futuschedule import util
from django.contrib.auth import get_user_model
import pytz
import uuid

def createEvent(calendarId, sendNotifications, summary, description, location,
        startDt, endDt, tzName, attendingEmails):
    """
    Create a new calendar event and return it.

    TODO: use some docstring format for function params.
    start/end - datetime.datetime objects in local time (.tzinfo is ignored)
    tzName - the timezone for the local times in start&end

    We let Google Calendar handle timezones, and when DST switches occur.
    Alternatively we can use pytz.localize(naive_datetime).isoformat() and pass
    only the 'dateTime' field to Google (in format '...+03:00'),
    without the 'timezone' field.
    """

    startDt, endDt = map(util.getNaive, (startDt, endDt))

    event = {
            'summary': summary,
            'description': description,
            'location': location,
            'start': {
                'dateTime': startDt.isoformat(),
                'timeZone': tzName,
            },
            'end': {
                'dateTime': endDt.isoformat(),
                'timeZone': tzName,
            },
            'attendees': map(lambda x: {'email': x}, attendingEmails),
            'conferenceData': {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {
                        'type': 'hangoutsMeet'
                    }
                }
            },
    }
    calSvc = util.buildCalendarSvc()
    return calSvc.events().insert(calendarId=calendarId,
                                  sendNotifications=sendNotifications,
                                  body=event,
                                  conferenceDataVersion=1).execute()

def deleteUsersFromEvent(calendarId, eventId, users, newSummary, sendNotifications=False):
    calSvc = util.buildCalendarSvc()
    eventJson = calSvc.events().get(calendarId=calendarId, eventId=eventId).execute()
    deleteUserEmails = map(lambda x: x.email, users)
    eventJson['attendees'] = filter(lambda x: x['email'] not in deleteUserEmails, eventJson['attendees'])
    eventJson['summary'] = newSummary

    #Create list of all human attendees as users (filter calendarResources like rooms out)
    attendeesList = filter(lambda a: not(a.has_key('resource') and a['resource']), eventJson['attendees'])
    attendees = map(lambda user: get_user_model().objects.get(email=user['email']), attendeesList)

    sendUpdates = "all" if sendNotifications else "none"

    return calSvc.events().update(calendarId=calendarId,
                                  eventId=eventId,
                                  body=eventJson,
                                  sendNotifications=sendNotifications,
                                  sendUpdates=sendUpdates).execute()

def addUsersToEvent(calendarId, eventId, users, newSummary, sendNotifications=False):
    calSvc = util.buildCalendarSvc()
    eventJson = calSvc.events().get(calendarId=calendarId, eventId=eventId).execute()
    userDicts = map(lambda x: {'email': x.email}, users)
    eventJson['attendees'] += userDicts
    eventJson['summary'] = newSummary

    #Create list of all human attendees as users (filter calendarResources like rooms out)
    attendeesList = filter(lambda a: not(a.has_key('resource') and a['resource']), eventJson['attendees'])
    attendees = map(lambda user: get_user_model().objects.get(email=user['email']), attendeesList)

    return calSvc.events().update(calendarId=calendarId, eventId=eventId, body=eventJson, sendNotifications=sendNotifications).execute()

def deleteEvent(calendarId, eventId, sendNotifications=False):
    """
    Delete the calendar event.
    """
    calSvc = util.buildCalendarSvc()
    calSvc.events().delete(calendarId=calendarId, eventId=eventId,
            sendNotifications=sendNotifications).execute()

#Returns True if the calendar with given calendarId has an event during the given timeframe
def isOccupied(calendarId, timeStart, timeEnd, timeZoneName):

    tz = pytz.timezone(timeZoneName)
    #one minute is added to the even starting time, because timeMin (minimum ending time to filter by) is inclusive (timeMax, on the other hand, is not)
    timeStart = tz.localize(util.getNaive(timeStart))+datetime.timedelta(minutes=1)
    timeEnd = tz.localize(util.getNaive(timeEnd))

    calSvc = util.buildCalendarSvc()
    events = calSvc.events().list(calendarId=calendarId, timeMin=timeStart.isoformat(), timeMax=timeEnd.isoformat(), timeZone=timeZoneName).execute()

    if events['items'] == []:
        return False
    return True
