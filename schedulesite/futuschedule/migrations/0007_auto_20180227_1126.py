# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0006_futuuser_name'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='futuuser',
            options={'ordering': ('name',)},
        ),
    ]
