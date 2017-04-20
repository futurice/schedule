from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model

import slumber
import _slumber_auth

class Command(BaseCommand):
    help = 'Fetch users from FUM, adding new, updating old and removing removed users from the database'

    def handle(self, *args, **options):
        api = slumber.API(settings.FUM_API_URL, auth=_slumber_auth.TokenAuth(settings.FUM_API_TOKEN))

        pageIndex = 1
        users = []
        while(True):
            data = api.users().get(page=pageIndex, fields='username, first_name, last_name, email, google_status, status, supervisor, id')

            #filter inactive users and users with missing data
            usersData = filter(lambda u: u['username'] and u['email'] and
                u['first_name'] and u['last_name'] and
                u['google_status'] == 'activeperson' and u['status'] == 'active', data["results"])

            users = users + usersData
            if ("next" not in data or data["next"] == None):
                break               
            pageIndex += 1

        #the following code is copied from the old implementation of the same task
        UM = get_user_model()
        userById = {u['id']: u for u in users}

        #remove users not in the user list from FUM
        keepUsernames = {u['username'] for u in users}
        for oldUser in UM.objects.all():
            if oldUser.username not in keepUsernames:
                oldUser.delete()

        #update existing users and add new ones
        for u in userById.values():
            try:
                newUser = UM.objects.get(username=u['username'])
                newUser.email = u['email']
                newUser.first_name = u['first_name']
                newUser.last_name = u['last_name']
                newUser.save()
            except UM.DoesNotExist as e:
                newUser = UM.objects.create_user(u['username'], u['email'],
                    u['first_name'], u['last_name'])
        
        #save supervisors for users
        for u in userById.values():
            if u['supervisor']:
                a = UM.objects.get(username=u['username'])
                try:
                    a.supervisor = UM.objects.get(
                        username=userById[u['supervisor']]['username'])
                except Exception as e:
                    print(e)
                a.save()



