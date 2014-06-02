from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class FutuUserManager(BaseUserManager):
    def create_user(self, username, email, first_name, last_name,
            password=None):
        user = self.model(username=username, email=email,
                first_name=first_name, last_name=last_name)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, username, email, first_name, last_name,
            password):
        user = self.create_user(username, email, first_name, last_name,
                password)
        user.is_admin = True
        user.save()
        return user

class FutuUser(AbstractBaseUser):
    username = models.CharField(max_length=40, unique=True, db_index=True)
    email = models.CharField(max_length=40, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
            related_name='supervisor_of')

    objects = FutuUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def get_short_name(self):
        return self.first_name

    def get_full_name(self):
        return self.first_name + ' ' + self.last_name

    @property
    def is_staff(self):
        return self.is_admin

    def has_perm(self, perm, obj=None):
        # TODO: is this ok?
        return True

    def has_module_perms(self, app_label):
        # TODO: is this ok?
        return True

    def __unicode__(self):
        return self.get_full_name() + ' (' + self.username + ')'

    class Meta:
        # TODO: this doesn't seem to work (by default)
        # in the Django REST Framework API
        ordering = ('first_name', 'last_name')


class CalendarResource(models.Model):
    """
    A meeting room.
    """
    resourceId = models.CharField(max_length=200, unique=True)
    email = models.EmailField(max_length=200)
    resourceType = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=200)

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('name',)


class TimeZone(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('name',)


class ScheduleTemplate(models.Model):
    """
    A set of event templates, e.g. 'New Employee Onboarding in Berlin'.
    """
    name = models.CharField(max_length=200)
    timezone = models.ForeignKey(TimeZone)

    def __unicode__(self):
        return self.name + ' (' + self.timezone.name + ')'

    class Meta:
        ordering = ('name',)


class EventTemplate(models.Model):
    summary = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.ForeignKey(CalendarResource, null=True, blank=True)

    # which calendar day the event is on. 0 is the employee's starting day,
    # 1 is her second day, -7 is 1 week before the starting day.
    dayOffset = models.SmallIntegerField()
    startTime = models.TimeField()
    endTime = models.TimeField()

    # Allow events where the employee(s) aren't invited, e.g. 'gather peer
    # feedback' or 'prepare welcome package (brand book, print health insurance
    # info)'.
    inviteEmployees = models.BooleanField(default=True)

    inviteSupervisors = models.BooleanField(default=False)
    otherInvitees = models.ManyToManyField(settings.AUTH_USER_MODEL,
            null=True, blank=True)

    # When making a schedule for multiple employees, a collective template
    # (e.g. Welcome Breakfast) creates a single event.
    # A non-collective (i.e. individual) template creates one event for each
    # employee.
    isCollective = models.BooleanField(default=True)

    scheduleTemplate = models.ForeignKey(ScheduleTemplate)

    def __unicode__(self):
        return self.summary

    class Meta:
        ordering = ('dayOffset', 'startTime')


class Schedule(models.Model):
    """
    A set of Events which were created together, for one user.

    E.g. the onboarding program for one employee.
    """
    forUser = models.ForeignKey(settings.AUTH_USER_MODEL)
    template = models.ForeignKey(ScheduleTemplate, null=True, blank=True,
            on_delete=models.SET_NULL)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return 'Schedule TODO' + ' (' + self.forUser.get_full_name() + ')'

class Event(models.Model):
    """
    An event which exists in Google Calendar.

    It may belong to several Schedules (e.g. a collective event).
    """
    # TODO: use JsonField when we start putting data here
    jsonData = models.BinaryField()
    schedules = models.ManyToManyField(Schedule)

    # Be able to group events by the template they came from (e.g. you didn't
    # attend the 'HC Intro' meeting so another one was scheduled for you).
    # But don't request that the templates stay in place forever. If they're
    # deleted, simply orphan this object.
    template = models.ForeignKey(EventTemplate, null=True, blank=True,
            on_delete=models.SET_NULL)

    def __unicode__(self):
        return 'Event (on ' + str(self.schedules.count()) + ' schedule(s))'
