from django.db import models
from django.contrib.auth.models import User


class FutuUser(models.Model):
    user = models.OneToOneField(User)
    supervisor = models.ForeignKey(User, related_name='supervisor_of',
            null=True)

    def __unicode__(self):
        # not ideal, does a DB lookup
        return unicode(self.user.username)


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
    otherInvitees = models.ManyToManyField(User)
