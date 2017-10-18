from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models
from oauth2client.contrib.django_util.models import CredentialsField



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
    email = models.CharField(max_length=100, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
            related_name='supervisor_of', on_delete=models.SET_NULL)

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


class Calendar(models.Model):
    email = models.EmailField(max_length=300, unique=True)

    def __unicode__(self):
        return self.email

    class Meta:
        ordering = ('email',)


class ScheduleTemplate(models.Model):
    """
    A set of event templates, e.g. 'New Employee Onboarding in Berlin'.
    """
    name = models.CharField(max_length=200, unique=True)
    timezone = models.ForeignKey(TimeZone, on_delete=models.PROTECT)
    calendar = models.ForeignKey(Calendar, on_delete=models.PROTECT)

    def __unicode__(self):
        return self.name + ' (' + self.timezone.name + ')'

    class Meta:
        ordering = ('name',)


class EventTemplate(models.Model):
    summary = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    locations = models.ManyToManyField(CalendarResource, blank=True)

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
            blank=True)

    # When making a schedule for multiple employees, a collective template
    # (e.g. Welcome Breakfast) creates a single event.
    # A non-collective (i.e. individual) template creates one event for each
    # employee.
    isCollective = models.BooleanField(default=True)

    scheduleTemplate = models.ForeignKey(ScheduleTemplate,
            on_delete=models.CASCADE)

    def __unicode__(self):
        return self.summary

    class Meta:
        ordering = ('dayOffset', 'startTime')


class SchedulingRequest(models.Model):
    """
    A bundle of work submitted by a user, to create schedules & events.

    This is made up of individual tasks (e.g. make google calendar events)
    which should all succeed or all fail.

    Maybe this could be better named.
    """

    # the JSON format is documented in views.createSchedules
    json = models.TextField()
    requestedBy = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
            blank=True, on_delete=models.SET_NULL)
    requestedAt = models.DateTimeField(auto_now_add=True)
    #when a pdf is generated from this schedule, the pdf location will be updated here
    pdfUrl = models.TextField(blank=True)

    IN_PROGRESS = 'IN_PROGRESS'
    SUCCESS = 'SUCCESS'
    ERROR = 'ERROR'
    ACTION_FAILED = 'ACTION_FAILED'
    status = models.CharField(
            max_length=max(map(len, (IN_PROGRESS, SUCCESS, ERROR, ACTION_FAILED))),
            choices = (
                (IN_PROGRESS, 'In progress'),
                (SUCCESS, 'Successfully completed'),
                (ERROR, 'Error'),
                (ACTION_FAILED, 'Action failed')
            ), null=False, blank=False, default=IN_PROGRESS)
    # error description if status is ERROR or ACTION_FAILED
    error = models.TextField(blank=True)


class Schedule(models.Model):
    """
    A set of Events which were created together, for one user.

    E.g. the onboarding program for one employee.
    """
    schedulingRequest = models.ForeignKey(SchedulingRequest,
            on_delete=models.PROTECT)
    forUser = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE)
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
    json = models.TextField()
    schedules = models.ManyToManyField(Schedule)

    # Be able to group events by the template they came from (e.g. you didn't
    # attend the 'HC Intro' meeting so another one was scheduled for you).
    # But don't request that the templates stay in place forever. If they're
    # deleted, simply orphan this object.
    template = models.ForeignKey(EventTemplate, null=True, blank=True,
            on_delete=models.SET_NULL)

    def __unicode__(self):
        return 'Event (on ' + str(self.schedules.count()) + ' schedule(s))'

class EventTask(models.Model):
    """
    Describes an event to create in both Google Calendar and our model.
    """
    summary = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    locations = models.ManyToManyField(CalendarResource, blank=True)
    startDt = models.DateTimeField()
    endDt = models.DateTimeField()
    attendees = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    schedules = models.ManyToManyField(Schedule)
    template = models.ForeignKey(EventTemplate, null=True, blank=True,
            on_delete=models.SET_NULL)


class DeletionTask(models.Model):
    """
    Describes which scheduling request to delete, who requested it and when.

    To follow our current model (single-threaded task queue processing,
    in order) and avoid concurrency / race conditions, this task is created
    when the user requests deletion and processed by the queue later.
    """
    schedReq = models.ForeignKey(SchedulingRequest, null=True, blank=True,
            on_delete=models.SET_NULL)
    requestedByUser = models.ForeignKey(settings.AUTH_USER_MODEL,
            null=True, blank=True, on_delete=models.SET_NULL)
    requestedAt = models.DateTimeField(auto_now_add=True)


class LastApiCall(models.Model):
    """
    Model with (at most) 1 object showing the most recent time we made a
    Google Calendar API call.
    """
    dt = models.DateTimeField(auto_now=True)


class CredentialsModel(models.Model):
  credentials_id = models.IntegerField()
  credential = CredentialsField()