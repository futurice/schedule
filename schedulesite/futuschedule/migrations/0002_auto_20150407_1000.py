# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='eventtask',
            name='attendees',
            field=models.ManyToManyField(to=settings.AUTH_USER_MODEL, blank=True),
        ),
        migrations.AlterField(
            model_name='eventtask',
            name='locations',
            field=models.ManyToManyField(to='futuschedule.CalendarResource', blank=True),
        ),
        migrations.AlterField(
            model_name='eventtemplate',
            name='locations',
            field=models.ManyToManyField(to='futuschedule.CalendarResource', blank=True),
        ),
        migrations.AlterField(
            model_name='eventtemplate',
            name='otherInvitees',
            field=models.ManyToManyField(to=settings.AUTH_USER_MODEL, blank=True),
        ),
        migrations.AlterField(
            model_name='futuuser',
            name='last_login',
            field=models.DateTimeField(null=True, verbose_name='last login', blank=True),
        ),
    ]
