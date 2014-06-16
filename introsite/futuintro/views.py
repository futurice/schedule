import datetime
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json

from futuintro import calendar, models, tasksched


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

def schedulingRequestDetail(request, sr_id):
    if request.method == 'DELETE':
        sr = models.SchedulingRequest.objects.get(id=sr_id)
        dr = models.DeletionTask.objects.create(schedReq=sr,
                requestedByUser=request.user)
        tasksched.enqueue(tasksched.DELETION_TASK, dr.id)
        return HttpResponse('')
    elif request.method == 'GET':
        context = {'sr_id': sr_id}
        return render(request, 'futuintro/scheduling-request-detail.html',
                context)
    else:
        return HttpResponse(json.dumps({'error': 'Method ' + request.method +
            ' not allowed.'}), content_type="application/json", status=405)

def schedules(request):
    return render(request, 'futuintro/schedules.html')

def scheduleDetail(request, s_id):
    context = {'s_id': s_id}
    return render(request, 'futuintro/schedule-detail.html', context)

def test(request):
    return render(request, 'futuintro/test')
