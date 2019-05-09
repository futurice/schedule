# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0010_futuuser_futubuddy'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventtemplate',
            name='inviteFutubuddies',
            field=models.BooleanField(default=False),
        ),
    ]
