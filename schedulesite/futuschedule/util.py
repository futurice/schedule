from apiclient.discovery import build
from gdata.calendar_resource.client import CalendarResourceClient
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage

from django.contrib.auth import get_user_model
from futuschedule.models import CalendarResource

import httplib2
import json


def ensureOAuthCredentials():
    """
    Returns credentials (creates a_credentials_file in current dir if absent).

    If that file is missing, reads client_secrets.json then prints a URL
    for you to authorize the App on Google. Paste the resulting token and it
    will create a_credentials_file.
    """
    storage = Storage('a_credentials_file')
    credentials = storage.get()
    if not credentials:
        flow = flow_from_clientsecrets('client_secrets.json',
                scope='https://www.googleapis.com/auth/calendar',
                redirect_uri='https://localhost:8000/oauth2callback',
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
    return build(serviceName='calendar', version='v3', http=http,
            developerKey='YOUR_DEVELOPER_KEY')

def updateUsers(jsonDumpFile):
    """
    Create or Update Users from a .json file dumped from FUM (see README).

    The users we create will have different IDs than the json dump.
    """
    UM = get_user_model()
    with open(jsonDumpFile, 'r') as f:
        dump = json.load(f)
    # de-duplicate first (the dump has a duplicate)
    userById = {u['id']: u for u in dump}

    for u in userById.values():
        if not (u['username'] and u['email'] and u['first_name'] and u['last_name']):
            print('Skipping', u['username'], 'because of invalid fields')
            del userById[u['id']]
            continue

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
            a.supervisor = UM.objects.get(
                    username=userById[u['supervisor']]['username'])
            a.save()

def updateMeetingRooms(email, password):
    client = CalendarResourceClient(domain='futurice.com')
    client.ClientLogin(email=email, password=password,
            source='futuschedule')
    # TODO: pagination
    # In May 2014 only getting a single page of results and can't figure out
    # how to request few (e.g. 5) results per page to test pagination.
    calendar_resources = client.GetResourceFeed()
    for r in calendar_resources.get_elements():
        if r.tag == 'entry':
            try:
                obj = CalendarResource.objects.get(resourceId=r.GetResourceId())
            except CalendarResource.DoesNotExist as e:
                obj = CalendarResource(resourceId=r.GetResourceId())
            obj.email=r.GetResourceEmail()
            obj.resourceType=r.GetResourceType() or ''
            obj.name=r.GetResourceCommonName()
            obj.description=r.GetResourceDescription() or ''
            obj.save()