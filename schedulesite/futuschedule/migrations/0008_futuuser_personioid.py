# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0007_auto_20180227_1126'),
    ]

    operations = [
        migrations.AddField(
            model_name='futuuser',
            name='personio_id',
            field=models.IntegerField(unique=True, null=True, blank=True),
        ),
    ]
