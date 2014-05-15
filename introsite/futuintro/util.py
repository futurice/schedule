from apiclient.discovery import build
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage

from django.contrib.auth.models import User
from futuintro.models import FutuUser

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
    with open(jsonDumpFile, 'r') as f:
        dump = json.load(f)
    # de-duplicate first (the dump has a duplicate)
    userById = {u['id']: u for u in dump}
    for u in userById.values():
        userById[u['id']] = u
        newUser = User.objects.create_user(u['username'], u['email'])
        if u['first_name']:
            newUser.first_name = u['first_name']
        if u['last_name']:
            newUser.last_name = u['last_name']
        newUser.save()
    for u in userById.values():
        fu = FutuUser()
        fu.user = User.objects.get(username=u['username'])
        if u['supervisor']:
            fu.supervisor = User.objects.get(
                    username=userById[u['supervisor']]['username'])
        fu.save()
