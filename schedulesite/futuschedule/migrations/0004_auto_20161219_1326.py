# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futuschedule', '0003_adduserstask'),
    ]

    operations = [
        migrations.AlterField(
            model_name='schedulingrequest',
            name='status',
            field=models.CharField(default=b'IN_PROGRESS', max_length=13, choices=[(b'IN_PROGRESS', b'In progress'), (b'SUCCESS', b'Successfully completed'), (b'ERROR', b'Error'), (b'UPDATE_FAILED', b'Update failed')]),
        ),
    ]
