from apiclient.discovery import build
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.file import Storage

import httplib2


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
