# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0004_auto_20161219_1326'),
    ]

    operations = [
        migrations.AddField(
            model_name='schedulingrequest',
            name='pdfUrl',
            field=models.TextField(blank=True),
        ),
    ]
