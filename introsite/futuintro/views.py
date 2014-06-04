import datetime
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json

from futuintro import calendar, models

@csrf_exempt
def ajax(request):
    data = {
            'a': 100,
            'b': ['Hello world!', 'Goodbye'],
            5: 3.5,
            'EUR': u'\u20AC',
            'your data was': json.load(request)
    }
    return HttpResponse(json.dumps(data, ensure_ascii=False), content_type='application/json; charset=utf-8')


def scheduleTemplates(request):
    return render(request, 'futuintro/schedule-templates.html')

def root(request):
    return render(request, 'futuintro/base.html')

def timezones(request):
    return render(request, 'futuintro/timezones.html')

def scheduleTemplateDetail(request, st_id):
    context = {'st_id': st_id}
    return render(request, 'futuintro/schedule-template-detail.html', context)

def newSchedulePage(request):
    return render(request, 'futuintro/new-schedule-page.html')


def createSchedules(request):
    """
    Create Google Calendar Events and Schedules and Events in our model.

    The request body looks like this:
    {
        scheduleTemplate: int,
        users: [list of user IDs],
        events: [{
                meta: {
                    isCollective: true
                },
                data: {
                    summary: 'Breakfast!',
                    description: 'Everyone is welcome',
                    location: int (room id) or null,
                    date: '2014-05-22',
                    startTime: '09:00',
                    endTime: '09:25',
                    invitees: [list of user IDs],
                    eventTemplate: int
                }
            },
            {
                meta: {
                    isCollective: false,
                    forUser: int (user ID)
                },
                data: {
                    ... same fields ...
                }
            }
            ...additional events...
        ]
    }
    """

    UM = get_user_model()
    body = json.load(request)
    tz = models.ScheduleTemplate.objects.get(
            id=body['scheduleTemplate']).timezone.name

    for ev in body['events']:
        room = (models.CalendarResource.objects.get(id=ev['data']['location'])
                if ev['data']['location'] else None)
        roomName = room.name if room else ''
        attendingEmails = map(lambda x: UM.objects.get(id=x).email,
                ev['data']['invitees'])
        if room:
            attendingEmails.append(room.email)

        d = datetime.datetime.strptime(ev['data']['date'], '%Y-%m-%d').date()
        # [:5] drops seconds from 'HH:MM:SS'
        sTime = datetime.datetime.strptime(ev['data']['startTime'][:5],
                '%H:%M').time()
        eTime = datetime.datetime.strptime(ev['data']['endTime'][:5],
                '%H:%M').time()
        startDt = datetime.datetime.combine(d, sTime)
        endDt = datetime.datetime.combine(d, eTime)

        calendar.createEvent(calendar.futuintroCalId, False,
                ev['data']['summary'], ev['data']['description'],
                roomName, startDt, endDt, tz, attendingEmails)

    # TODO: in case of error, try to roll back everything

    return HttpResponse('')
