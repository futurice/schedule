from django.contrib.auth import get_user_model
from rest_framework import viewsets, routers, serializers
from futuschedule import models


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                'supervisor')

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = get_user_model().objects.all()
    filter_fields = ('username',)   # ?username=jim
    search_fields = ('username', 'first_name', 'last_name') # ?search=jim
    ordering_fields = ('username', 'first_name', 'last_name')
    # or ordering_fields = '__all__'
    # ?ordering=last_name ?ordering=-last_name ?ordering=first_name,-last_name


class TimeZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TimeZone

class TimeZoneViewSet(viewsets.ModelViewSet):
    serializer_class = TimeZoneSerializer
    queryset = models.TimeZone.objects.all()


class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Calendar

class CalendarViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarSerializer
    queryset = models.Calendar.objects.all()


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ScheduleTemplate

class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleTemplateSerializer
    queryset = models.ScheduleTemplate.objects.all()


class EventTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.EventTemplate

class EventTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = EventTemplateSerializer
    queryset = models.EventTemplate.objects.all()
    filter_fields = ('scheduleTemplate',)
    ordering_fields = ('dayOffset', 'startTime')


class CalendarResourcesSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CalendarResource

class CalendarResourcesViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarResourcesSerializer
    queryset = models.CalendarResource.objects.all()


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Schedule

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    queryset = models.Schedule.objects.all()
    filter_fields = ('schedulingRequest',)
    ordering_fields = ('createdAt',)


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Event

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    queryset = models.Event.objects.all()
    filter_fields = ('schedules',)


class SchedulingRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SchedulingRequest

class SchedulingRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SchedulingRequestSerializer
    queryset = models.SchedulingRequest.objects.all()
    ordering_fields = ('requestedAt',)


# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
for prefix, viewset in {
        r'users': UserViewSet,
        r'timezones': TimeZoneViewSet,
        r'calendars': CalendarViewSet,
        r'scheduletemplates': ScheduleTemplateViewSet,
        r'eventtemplates': EventTemplateViewSet,
        r'calendarresources': CalendarResourcesViewSet,
        r'schedules': ScheduleViewSet,
        r'events': EventViewSet,
        r'schedulingrequests': SchedulingRequestViewSet,
        }.items():
    router.register(prefix, viewset)
