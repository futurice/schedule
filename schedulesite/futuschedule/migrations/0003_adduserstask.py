# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0002_auto_20150407_1000'),
    ]

    operations = [
        migrations.CreateModel(
            name='AddUsersTask',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('schedReq', models.ForeignKey(to='futuschedule.SchedulingRequest')),
                ('usersToAdd', models.ManyToManyField(to=settings.AUTH_USER_MODEL, blank=True)),
            ],
        ),
    ]
