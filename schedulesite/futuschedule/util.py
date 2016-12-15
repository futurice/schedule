from apiclient.discovery import build
from gdata.calendar_resource.client import CalendarResourceClient
from gdata.gauth import OAuth2TokenFromCredentials
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import utc
from futuschedule.models import CalendarResource

import httplib2
import json
import datetime


def ensureOAuthCredentials(secrets_file='client_secrets.json', storage_file='a_credentials_file', redirect_uri='https://localhost:8000/oauth2callback',
        scope=['https://www.googleapis.com/auth/calendar', 'https://apps-apis.google.com/a/feeds/calendar/resource/']):
    """
    Returns credentials (creates a_credentials_file in current dir if absent).

    If that file is missing, reads client_secrets.json then prints a URL
    for you to authorize the App on Google. Paste the resulting token and it
    will create a_credentials_file.
    """
    storage = Storage(storage_file)
    credentials = storage.get()
    if not credentials:
        flow = flow_from_clientsecrets(filename=secrets_file,
                scope=scope,
                redirect_uri=redirect_uri,
                )
        # Try to get refresh token in response. Taken from:
        # https://developers.google.com/glass/develop/mirror/authorization
        flow.params['approval_prompt'] = 'force'
        auth_uri = flow.step1_get_authorize_url()
        print auth_uri
        code = raw_input("Auth token: ")
        credentials = flow.step2_exchange(code)
        storage.put(credentials)
    return credentials

def buildCalendarSvc():
    credentials = ensureOAuthCredentials()
    http = httplib2.Http()
    http = credentials.authorize(http)
    return build(serviceName='calendar', version='v3', http=http)

def calendar_resource():
    client = CalendarResourceClient(domain=settings.CALENDAR_DOMAIN)
    token = OAuth2TokenFromCredentials(ensureOAuthCredentials())
    return token.authorize(client)

def updateUsers(jsonDumpFile):
    """
    Create or Update Users from a .json file dumped from FUM (see README).

    The users we create will have different IDs than the json dump.
    """
    UM = get_user_model()
    with open(jsonDumpFile, 'r') as f:
        dump = list(filter(lambda u:
            u['username'] and u['email'] and
            u['first_name'] and u['last_name'] and
            u['google_status'] == 'activeperson' and u['status'] == 'active',
            json.load(f)))
    # de-duplicate first (the dump has a duplicate)
    userById = {u['id']: u for u in dump}

    # Delete existing DB users not present in this dump
    keepUsernames = {u['username'] for u in dump}
    for oldUser in UM.objects.all():
        if oldUser.username not in keepUsernames:
            oldUser.delete()

    for u in userById.values():
        try:
            newUser = UM.objects.get(username=u['username'])
            newUser.email = u['email']
            newUser.first_name = u['first_name']
            newUser.last_name = u['last_name']
        except UM.DoesNotExist as e:
            newUser = UM.objects.create_user(u['username'], u['email'],
                    u['first_name'], u['last_name'])

        # TODO: make HC and IT admins
        if False:
            newUser.is_admin = True
        newUser.save()

    for u in userById.values():
        if u['supervisor']:
            a = UM.objects.get(username=u['username'])
            try:
                a.supervisor = UM.objects.get(
                        username=userById[u['supervisor']]['username'])
            except Exception as e:
                print(e)
            a.save()

def updateMeetingRooms():
    # TODO: pagination
    # In May 2014 only getting a single page of results and can't figure out
    # how to request few (e.g. 5) results per page to test pagination.
    calendar_resources = calendar_resource().GetResourceFeed()

    # current resource (meeting room) ids in Google Calendar
    crt_res_ids = set()
    for r in calendar_resources.get_elements():
        if r.tag == 'entry':
            res_id = r.GetResourceId()
            crt_res_ids.add(res_id)
            try:
                obj = CalendarResource.objects.get(resourceId=res_id)
            except CalendarResource.DoesNotExist as e:
                obj = CalendarResource(resourceId=res_id)
            obj.email=r.GetResourceEmail()
            obj.resourceType=r.GetResourceType() or ''
            obj.name=r.GetResourceCommonName()

            descr_max_len = (CalendarResource._meta.get_field('description')
                    .max_length)
            obj.description=(r.GetResourceDescription() or '')[:descr_max_len]

            obj.save()

    for r in CalendarResource.objects.filter():
        if r.resourceId not in crt_res_ids:
            r.delete()

# returns a datetime object combing date (YY-MM-DD) and time (HH:MM or HH-MM-SS), both as strings.
def parseDate(datestring, timestring):

    date = datetime.datetime.strptime(datestring,
                    '%Y-%m-%d').date()
    # [:5] drops seconds from 'HH:MM:SS' if present
    time = datetime.datetime.strptime(timestring[:5],
        '%H:%M').time()
    return datetime.datetime.combine(date, time).replace(tzinfo=utc)

def getNaive(dt):
    """Return a naive datetime object for a possibly tz-aware one."""
    return datetime.datetime(dt.year, dt.month, dt.day, dt.hour, dt.minute)
    
