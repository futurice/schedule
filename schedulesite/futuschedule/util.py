from apiclient.discovery import build
from gdata.calendar_resource.client import CalendarResourceClient
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage

from django.contrib.auth import get_user_model
from futuschedule.models import CalendarResource

import getpass
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

def createUsers(jsonDumpFile):
    """
    Create Users from a .json file dumped from FUM (see README).

    This is a helper for DEV.
    The users we create will have different IDs than the json dump.
    """
    UM = get_user_model()
    with open(jsonDumpFile, 'r') as f:
        dump = json.load(f)
    # de-duplicate first (the dump has a duplicate)
    userById = {u['id']: u for u in dump}

    for u in userById.values():
        userById[u['id']] = u
        if not (u['username'] and u['email'] and u['first_name'] and u['last_name']):
            print('Skipping', u['username'], 'because of invalid fields')
            del userById[u['id']]
            continue
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

def createMeetingRooms():
    username = 'google.admin@futurice.com'
    psw = getpass.getpass('Password for ' + username + ': ')
    client = CalendarResourceClient(domain='futurice.com')
    client.ClientLogin(email=username, password=psw, source='test-futuschedule')
    # TODO: pagination
    # In May 2014 only getting a single page of results and can't figure out
    # how to request few (e.g. 5) results per page to test pagination.
    calendar_resources = client.GetResourceFeed()
    for r in calendar_resources.get_elements():
        if r.tag == 'entry':
            CalendarResource(
                    resourceId=r.GetResourceId(),
                    email=r.GetResourceEmail(),
                    resourceType=r.GetResourceType() or '',
                    name=r.GetResourceCommonName(),
                    description=r.GetResourceDescription() or '',
            ).save()
