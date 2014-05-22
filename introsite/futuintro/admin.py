from django.contrib import admin
from futuintro.models import (Schedule, Event, CalendarResource, TimeZone,
        ScheduleTemplate, EventTemplate)

for cls in (Schedule, Event, CalendarResource, TimeZone, ScheduleTemplate,
        EventTemplate):
    admin.site.register(cls)
