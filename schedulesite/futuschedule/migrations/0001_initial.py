# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FutuUser',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(default=django.utils.timezone.now, verbose_name='last login')),
                ('username', models.CharField(unique=True, max_length=40, db_index=True)),
                ('email', models.CharField(unique=True, max_length=100)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('is_admin', models.BooleanField(default=False)),
                ('supervisor', models.ForeignKey(related_name='supervisor_of', on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'ordering': ('first_name', 'last_name'),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Calendar',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('email', models.EmailField(unique=True, max_length=300)),
            ],
            options={
                'ordering': ('email',),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='CalendarResource',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('resourceId', models.CharField(unique=True, max_length=200)),
                ('email', models.EmailField(max_length=200)),
                ('resourceType', models.CharField(max_length=200)),
                ('name', models.CharField(max_length=200)),
                ('description', models.CharField(max_length=200)),
            ],
            options={
                'ordering': ('name',),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='DeletionTask',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('requestedAt', models.DateTimeField(auto_now_add=True)),
                ('requestedByUser', models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('json', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EventTask',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('summary', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('startDt', models.DateTimeField()),
                ('endDt', models.DateTimeField()),
                ('attendees', models.ManyToManyField(to=settings.AUTH_USER_MODEL, null=True, blank=True)),
                ('locations', models.ManyToManyField(to='futuschedule.CalendarResource')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EventTemplate',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('summary', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('dayOffset', models.SmallIntegerField()),
                ('startTime', models.TimeField()),
                ('endTime', models.TimeField()),
                ('inviteEmployees', models.BooleanField(default=True)),
                ('inviteSupervisors', models.BooleanField(default=False)),
                ('isCollective', models.BooleanField(default=True)),
                ('locations', models.ManyToManyField(to='futuschedule.CalendarResource')),
                ('otherInvitees', models.ManyToManyField(to=settings.AUTH_USER_MODEL, null=True, blank=True)),
            ],
            options={
                'ordering': ('dayOffset', 'startTime'),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='LastApiCall',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('dt', models.DateTimeField(auto_now=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Schedule',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('createdAt', models.DateTimeField(auto_now_add=True)),
                ('updatedAt', models.DateTimeField(auto_now=True)),
                ('forUser', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ScheduleTemplate',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=200)),
                ('calendar', models.ForeignKey(to='futuschedule.Calendar', on_delete=django.db.models.deletion.PROTECT)),
            ],
            options={
                'ordering': ('name',),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='SchedulingRequest',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('json', models.TextField()),
                ('requestedAt', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(default=b'IN_PROGRESS', max_length=11, choices=[(b'IN_PROGRESS', b'In progress'), (b'SUCCESS', b'Successfully completed'), (b'ERROR', b'Error')])),
                ('error', models.TextField(blank=True)),
                ('requestedBy', models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('taskType', models.CharField(max_length=100)),
                ('modelId', models.IntegerField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TimeZone',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=100)),
            ],
            options={
                'ordering': ('name',),
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='scheduletemplate',
            name='timezone',
            field=models.ForeignKey(to='futuschedule.TimeZone', on_delete=django.db.models.deletion.PROTECT),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='schedule',
            name='schedulingRequest',
            field=models.ForeignKey(to='futuschedule.SchedulingRequest', on_delete=django.db.models.deletion.PROTECT),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='schedule',
            name='template',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to='futuschedule.ScheduleTemplate', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='eventtemplate',
            name='scheduleTemplate',
            field=models.ForeignKey(to='futuschedule.ScheduleTemplate'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='eventtask',
            name='schedules',
            field=models.ManyToManyField(to='futuschedule.Schedule'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='eventtask',
            name='template',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to='futuschedule.EventTemplate', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='event',
            name='schedules',
            field=models.ManyToManyField(to='futuschedule.Schedule'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='event',
            name='template',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to='futuschedule.EventTemplate', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='deletiontask',
            name='schedReq',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, blank=True, to='futuschedule.SchedulingRequest', null=True),
            preserve_default=True,
        ),
    ]
