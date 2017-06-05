# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0002_auto_20150407_1000'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Task',
        ),
        migrations.AddField(
            model_name='schedulingrequest',
            name='pdfUrl',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='schedulingrequest',
            name='status',
            field=models.CharField(default=b'IN_PROGRESS', max_length=13, choices=[(b'IN_PROGRESS', b'In progress'), (b'SUCCESS', b'Successfully completed'), (b'ERROR', b'Error'), (b'UPDATE_FAILED', b'Update failed')]),
        ),
    ]
