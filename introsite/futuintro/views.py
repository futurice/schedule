import datetime
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json

from futuintro import calendar, models, tasksched

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
    Create SchedulingRequest and submit a task in the queue to process it.

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
                    locations: [list of room IDs],
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

    if request.method == 'POST':
        schedReq = models.SchedulingRequest.objects.create(
                json=json.load(request),
                requestedBy=request.user,
                status=models.SchedulingRequest.IN_PROGRESS)
        tasksched.enqueue(tasksched.SCHED_REQ, schedReq.id)
        return HttpResponse('', status=202)

    return HttpResponse(json.dumps({'error': 'Method ' + request.method +
        ' not allowed. Use POST instead.'}),
        content_type="application/json", status=405)

def schedulingRequests(request):
    return render(request, 'futuintro/scheduling-requests.html')
