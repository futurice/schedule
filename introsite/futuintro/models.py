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
        return self.username


class Schedule(models.Model):
    """
    A set of Events which were created together, for one user.

    E.g. the onboarding program for one employee.
    """
    forUser = models.ForeignKey(settings.AUTH_USER_MODEL)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

class Event(models.Model):
    """
    An event which exists in Google Calendar.

    It may belong to several Schedules (e.g. a collective event).
    """
    jsonData = models.BinaryField()
    schedules = models.ManyToManyField(Schedule)


class CalendarResource(models.Model):
    """
    A meeting room.
    """
    resourceId = models.CharField(max_length=200, primary_key=True)
    email = models.EmailField(max_length=200)
    resourceType = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=200)


class TimeZone(models.Model):
    name = models.CharField(max_length=100, primary_key=True)


class ScheduleTemplate(models.Model):
    """
    A set of event templates, e.g. 'New Employee Onboarding in Berlin'.
    """
    timezone = models.ForeignKey(TimeZone)


class EventTemplate(models.Model):
    summary = models.CharField(max_length=200)
    description = models.TextField()
    location = models.ForeignKey(CalendarResource, null=True)
    # which calendar day the event is on. 1 is the employee's starting day.
    dayNumber = models.PositiveSmallIntegerField()
    startTime = models.TimeField()
    endTime = models.TimeField()

    # Allow events where the employee(s) aren't invited, e.g. 'gather peer
    # feedback' or 'prepare welcome package (brand book, print health insurance
    # info)'.
    inviteEmployees = models.BooleanField(default=True)

    inviteSupervisors = models.BooleanField(default=False)
    otherInvitees = models.ManyToManyField(settings.AUTH_USER_MODEL)

    # When making a schedule for multiple employees, a collective template
    # (e.g. Welcome Breakfast) creates a single event.
    # A non-collective (i.e. individual) template creates one event for each
    # employee.
    isCollective = models.BooleanField(default=True)

    schedule = models.ForeignKey(ScheduleTemplate)
