from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model

import os
import json
import requests

class Command(BaseCommand):
    help = 'Fetch users, add new, update old and remove gone users from the database'

    def get_users(self):
        data = requests.get(os.getenv('USERS_URL')).text
        users = json.loads(data)
        # ensure all required fields exist
        users = [u for u in users if ('login' in u and 'email' in u)]
        return users

    def handle(self, *args, **options):
        users = self.get_users()

        UM = get_user_model()

        #remove users not in the user list from FUM
        usersList = [u['login'] for u in users]
        oldUsers = UM.objects.all().values_list('username', flat=True)
        for username in oldUsers:
            if username not in usersList:
                UM.objects.filter(username=username).delete()

        #update existing users and add new ones
        for u in users:
            try:
                newUser = UM.objects.get(username=u['login'])
                newUser.email = u['email']
                newUser.name = u['name']
                newUser.save()
            except UM.DoesNotExist as e:
                newUser = UM.objects.create_user(u['login'],
                            u['email'],
                            u['name'],)
        
        #save supervisors for users
        for u in users:
            if u.get('supervisorLogin', None):
                a = UM.objects.get(username=u['login'])
                try:
                    a.supervisor = UM.objects.get(username=u['supervisorLogin'])
                except Exception as e:
                    print(e)
                a.save()



