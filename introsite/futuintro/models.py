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
    email = models.CharField(max_length=40, unique=True, null=True)
    first_name = models.CharField(max_length=100, null=True)
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


class ScheduledEventGroup(models.Model):
    """
    A set of ScheduledEvents which were created together.

    E.g. they represent the onboarding program for one employee.
    """
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

class ScheduledEvent(models.Model):
    """
    An event which exists in Google Calendar.

    Has 'Scheduled' in the name so we don't confuse it with an event template.
    """
    jsonData = models.BinaryField()
    eventGroup = models.ForeignKey(ScheduledEventGroup)


class EventTemplate(models.Model):
    summary = models.CharField(max_length=200)
    description = models.CharField(max_length=200)
    location = models.CharField(max_length=100)
    # which calendar day the event is on. 1 is the employee's starting day.
    dayNumber = models.PositiveSmallIntegerField()
    startTime = models.TimeField()
    endTime = models.TimeField()
    timezone = models.CharField(max_length=100)

    inviteEmployee = models.BooleanField()
    inviteEmployee.default = True

    inviteSupervisor = models.BooleanField()
    inviteSupervisor.default = False
    otherInvitees = models.ManyToManyField(settings.AUTH_USER_MODEL)
