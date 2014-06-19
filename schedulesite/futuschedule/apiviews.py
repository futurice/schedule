from django.contrib.auth import get_user_model
import django_filters
from rest_framework import viewsets, routers
from futuschedule import models

class UserViewSet(viewsets.ModelViewSet):
    model = get_user_model()
    filter_fields = ('username',)   # ?username=jim
    search_fields = ('username', 'first_name', 'last_name') # ?search=jim
    ordering_fields = ('username', 'first_name', 'last_name')
    # or ordering_fields = '__all__'
    # ?ordering=last_name ?ordering=-last_name ?ordering=first_name,-last_name

class TimeZoneViewSet(viewsets.ModelViewSet):
    model = models.TimeZone
    ordering_fields = ('name',)

class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    model = models.ScheduleTemplate
    ordering_fields = ('name',)

class EventTemplateViewSet(viewsets.ModelViewSet):
    model = models.EventTemplate
    filter_fields = ('scheduleTemplate',)
    ordering_fields = ('dayOffset', 'startTime')

class CalendarResourcesViewSet(viewsets.ModelViewSet):
    model = models.CalendarResource

class ScheduleViewSet(viewsets.ModelViewSet):
    model = models.Schedule
    filter_fields = ('schedulingRequest',)
    ordering_fields = ('createdAt',)

class EventFilterSet(django_filters.FilterSet):
    class Meta:
        model = models.Event

class EventViewSet(viewsets.ModelViewSet):
    model = models.Event
    filter_class = EventFilterSet

class SchedulingRequestViewSet(viewsets.ModelViewSet):
    model = models.SchedulingRequest
    ordering_fields = ('requestedAt')


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
        r'schedulingrequests': SchedulingRequestViewSet,
        }.items():
    router.register(prefix, viewset)
