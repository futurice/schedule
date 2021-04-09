import datetime
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings
import json
from django.contrib.auth import get_user_model
from futuschedule import calendar, models, util
from futuschedule.tasks import processSchedulingRequest, processDeletionTask, processAddUsersRequest, processGeneratePdf, processDeleteUsersRequest


def scheduleTemplates(request):
    return render(request, 'futuschedule/schedule-templates.html')

@ensure_csrf_cookie
def index(request):
    return render(request, 'futuschedule/base.html')

def timezones(request):
    return render(request, 'futuschedule/timezones.html')

def calendars(request):
    return render(request, 'futuschedule/calendars.html')

def scheduleTemplateDetail(request, st_id):
    context = {'st_id': st_id}
    return render(request, 'futuschedule/schedule-template-detail.html', context)

def newSchedulePage(request):
    return render(request, 'futuschedule/new-schedule-page.html')


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

    def parsedate(date, time):
        return datetime.datetime.strptime(date+'-'+time, '%Y-%m-%d-%H:%M')

    # Check if meeting rooms are available
    data = json.loads(request.body)
    timezone = models.ScheduleTemplate.objects.get(id=str(data['scheduleTemplate'])).timezone.name
    errors = []

    for event in data['events']:
        for location in event['data']['locations']:
            room = models.CalendarResource.objects.get(id = str(location))
            start = parsedate(event['data']['date'], event['data']['startTime'])
            end = parsedate(event['data']['date'], event['data']['endTime'])
            if(calendar.isOccupied(room.email, start, end, timezone)):
                errors += [room.name + " is not available on "+ event['data']['date'] + " at " + event['data']['startTime'] + "-" + event['data']['endTime']]

    if errors != []:
        return HttpResponse(json.dumps({'error': ', '.join(errors)}),
        content_type="application/json", status=400)


    if request.method == 'POST':
        schedReq = models.SchedulingRequest.objects.create(
                json=json.dumps(json.load(request)),
                requestedBy=request.user,
                status=models.SchedulingRequest.IN_PROGRESS)
        processSchedulingRequest.delay(schedReq.id)
        return HttpResponse('', status=202)

    return HttpResponse(json.dumps({'error': 'Method ' + request.method +
        ' not allowed. Use POST instead.'}),
        content_type="application/json", status=405)

def schedulingRequests(request):
    return render(request, 'futuschedule/scheduling-requests.html')

def schedulingRequestDetail(request, sr_id):
    if request.method == 'DELETE':
        sr = models.SchedulingRequest.objects.get(id=sr_id)
        dr = models.DeletionTask.objects.create(schedReq=sr,
                requestedByUser=request.user)
        processDeletionTask.delay(dr.id)
        return HttpResponse('')
    elif request.method == 'GET':
        context = {'sr_id': sr_id}
        return render(request, 'futuschedule/scheduling-request-detail.html',
                context)
    else:
        return HttpResponse(json.dumps({'error': 'Method ' + request.method +
            ' not allowed.'}), content_type="application/json", status=405)

def addUsersToSchedule(request, sr_id):

    data = json.loads(request.body)
    sr = models.SchedulingRequest.objects.get(id=sr_id)
    usersToAdd = map(lambda user: user['id'], data['users'])
    sr.status = models.SchedulingRequest.IN_PROGRESS
    sr.save()
    processAddUsersRequest.delay(sr_id, usersToAdd)
    return HttpResponse('', status=200)

def deleteUsersFromSchedule(request, sr_id):

    data = json.loads(request.body)
    sr = models.SchedulingRequest.objects.get(id=sr_id)
    usersToDelete = map(lambda user: user['id'], data['users'])
    sr.status = models.SchedulingRequest.IN_PROGRESS
    sr.save()
    processDeleteUsersRequest.delay(sr_id, usersToDelete)
    return HttpResponse('', status=200)

def schedules(request):
    return render(request, 'futuschedule/schedules.html')

def scheduleDetail(request, s_id):
    context = {'s_id': s_id}
    return render(request, 'futuschedule/schedule-detail.html', context)

def getPdf(request, personio_id):
    persons = models.FutuUser.objects.filter(personio_id=personio_id)
    if (len(persons)) > 0:
        schedules = models.Schedule.objects.filter(forUser=persons[0]).order_by('-updatedAt')
        if len(schedules) > 0:
            processGeneratePdf(schedules[0].schedulingRequest_id)
            schedulingRequest = models.SchedulingRequest.objects.get(id=schedules[0].schedulingRequest_id)
            pdf = open('/opt' + schedulingRequest.pdfUrl, "r")
            return HttpResponse(pdf, content_type="application/pdf", status=200)
        else:
            return HttpResponse("Couldn't find schedule associated to user", status=400)
    else:
        return HttpResponse("Couldn't find person", status=400)

def generatePdf(request, sr_id):
    processGeneratePdf.delay(sr_id)
    return HttpResponse('', status=200)

def test(request):
    return render(request, 'futuschedule/test/')

def copyScheduleTemplate(request, st_id):
    scheduleTemplate = models.ScheduleTemplate.objects.get(id=st_id)
    newName = scheduleTemplate.name + ' (COPY)'
    util.copyScheduleTemplate(st_id, newName)
    return HttpResponse('', status=200)
