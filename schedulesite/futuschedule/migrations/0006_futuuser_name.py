# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0005_credentialsmodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='futuuser',
            name='name',
            field=models.CharField(max_length=255, null=True),
        ),
    ]
