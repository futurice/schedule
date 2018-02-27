from apiclient.discovery import build
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage
from oauth2client.contrib.django_util import storage as django_storage

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import utc
from futuschedule.models import CalendarResource, CredentialsModel

import os
import httplib2
import json
import datetime

def get_oauth_storage(storage_file=None, storage_id=0):
    if settings.OAUTH_DB_STORAGE:
        return django_storage.DjangoORMStorage(CredentialsModel, 'credentials_id', storage_id, 'credential')
    return Storage(storage_file)

def ensureOAuthCredentials(secrets_file='client_secrets.json', storage_file='a_credentials_file', redirect_uri='https://localhost:8000/oauth2callback',
        scope=['https://www.googleapis.com/auth/calendar', 'https://apps-apis.google.com/a/feeds/calendar/resource/', 'https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly',
        'https://www.googleapis.com/auth/admin.directory.resource.calendar'], storage_id=0):
    """
    Returns credentials (creates a_credentials_file in current dir if absent).

    If that file is missing, reads client_secrets.json then prints a URL
    for you to authorize the App on Google. Paste the resulting token and it
    will create a_credentials_file.
    """
    secrets_file = os.path.join(os.path.dirname(settings.BASE_DIR), secrets_file)
    storage_file = os.path.join(os.path.dirname(settings.BASE_DIR), storage_file)
    storage = get_oauth_storage(storage_file=storage_file, storage_id=storage_id)
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

def authorize():
    credentials = ensureOAuthCredentials()
    http = httplib2.Http()
    return credentials.authorize(http)

def buildCalendarSvc():
    return build(serviceName='calendar', version='v3', http=authorize())

def buildAdmin():
    return build(serviceName='admin', version='directory_v1', http=authorize())

def updateMeetingRooms():
    calres = buildAdmin().resources().calendars().list(customer='my_customer').execute()
    crt_res_ids = set()
    for r in calres['items']:
        res_id = r['resourceId']
        crt_res_ids.add(res_id)
        try:
            obj = CalendarResource.objects.get(resourceId=res_id)
        except CalendarResource.DoesNotExist as e:
            obj = CalendarResource(resourceId=res_id)
        obj.email=r['resourceEmail']
        obj.resourceType=r.get('resourceType') or ''
        obj.name=r['generatedResourceName'] # or ResourceName?
        obj.description=r.get('resourceDescription', '')[:190] or ''
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
    
