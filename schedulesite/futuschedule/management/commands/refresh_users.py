from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model

import os
import json
import requests

class Command(BaseCommand):
    help = 'Fetch users, add new, update old and remove gone users from the database'

    def get_users(self):
        data = requests.get(os.getenv('USERS_URL'))
        users = json.loads(data.text)
        return users

    def get_email(self, user):
        return '%s@futurice.com'%(user['username'])

    def handle(self, *args, **options):
        users = self.get_users()

        UM = get_user_model()

        #remove users not in the user list from FUM
        usersList = [u['username'] for u in users]
        oldUsers = UM.objects.all().values_list('username', flat=True)
        for username in oldUsers:
            if username not in usersList:
                UM.objects.filter(username=username).delete()

        #update existing users and add new ones
        for u in users:
            try:
                newUser = UM.objects.get(username=u['username'])
                newUser.email = self.get_email(u)
                newUser.first_name = u['first']
                newUser.last_name = u['last']
                newUser.save()
            except UM.DoesNotExist as e:
                newUser = UM.objects.create_user(u['username'],
                            self.get_email(u),
                            u['first'],
                            u['last'])
        
        #save supervisors for users
        for u in users:
            if u.get('supervisor', None):
                a = UM.objects.get(username=u['username'])
                try:
                    a.supervisor = UM.objects.get(username=u['supervisor'])
                except Exception as e:
                    print(e)
                a.save()



