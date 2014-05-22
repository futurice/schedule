from django.contrib.auth import get_user_model
from rest_framework import viewsets, routers
from futuintro import models

class UserViewSet(viewsets.ModelViewSet):
    model = get_user_model()

class TimeZoneViewSet(viewsets.ModelViewSet):
    model = models.TimeZone

class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    model = models.ScheduleTemplate

class EventTemplateViewSet(viewsets.ModelViewSet):
    model = models.EventTemplate

class CalendarResourcesViewSet(viewsets.ModelViewSet):
    model = models.CalendarResource

class ScheduleViewSet(viewsets.ModelViewSet):
    model = models.Schedule

class EventViewSet(viewsets.ModelViewSet):
    model = models.Event


# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
for prefix, viewset in {
        r'users': UserViewSet,
        r'timezones': TimeZoneViewSet,
        r'scheduletemplates': ScheduleTemplateViewSet,
        r'eventtemplates': EventTemplateViewSet,
        r'calendarresources': CalendarResourcesViewSet,
        r'schedules': ScheduleViewSet,
        r'events': EventViewSet,
        }.items():
    router.register(prefix, viewset)
