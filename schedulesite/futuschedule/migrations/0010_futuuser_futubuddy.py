# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0009_eventtemplate_monthoffset'),
    ]

    operations = [
        migrations.AddField(
            model_name='futuuser',
            name='futubuddy_email',
            field=models.EmailField(max_length=200, null=True, blank=True),
        ),
    ]
