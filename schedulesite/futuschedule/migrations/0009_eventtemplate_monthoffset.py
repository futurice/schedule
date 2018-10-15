# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0008_futuuser_personioid'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventtemplate',
            name='monthOffset',
            field=models.SmallIntegerField(null=False, default=0),
        ),
    ]
