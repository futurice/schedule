"""
Encapsulates task scheduling.

enqueue() submits a task, and tasks are processed sequentially, in the order
in which they are submitted.
The actual task queue implementation is encapsulated (and hidden) in this
module.

Task types are mapped to task implementations by implForName, and those
implementations are executed sequentially.
"""

import datetime
from django.contrib.auth import get_user_model
from django.db import models
from django.utils.timezone import utc
import json
import logging
import sys
import time
import traceback

from futuintro.models import (Task, Schedule, CalendarResource, EventTask,
        EventTemplate, SchedulingRequest, ScheduleTemplate, Event,
        LastApiCall)
from futuintro import calendar

logging.basicConfig()


def enqueue(taskType, modelId):
    """
    Enqueue a task with the given type and modelId parameter.

    The modelId is passed to the task implementation and should be the ID of a
    model object which tells the task what it must do (i.e. it holds the task's
    parameters).
    """
    # right now delegating to our own implementation because it was the fastest
    # thing to get running. Can easily replace with another task system.
    Task.objects.create(taskType=taskType, modelId=modelId)


def process(taskType, modelId):
    if taskType not in implForName:
        logging.error('Invalid task type ' + str(taskType))
        return
    handler = implForName[taskType]
    handler(modelId)


def loop():
    """
    Loop forever looking for tasks and processing them in order.
    """
    while True:
        try:
            if not Task.objects.count():
                time.sleep(1)
                continue
            minId = Task.objects.aggregate(models.Min('id'))['id__min']
            t = Task.objects.get(id=minId)
            t.delete()
            process(t.taskType, t.modelId)
        except KeyboardInterrupt as e:
            raise
        except:
            # recover from an unexpected exception thrown by the task processor
            exctype, value = sys.exc_info()[:2]
            logging.error(str(exctype) + ' ' + str(value))


def processSchedulingRequest(modelId):
    def makeSchedules():
        schedules = []
        for uid in body['users']:
            try:
                user = UM.objects.get(id=uid)
            except UM.DoesNotExist as e:
                continue
            schedules.append(Schedule.objects.create(
                schedulingRequest=schedReq, forUser=user, template=schedTempl))
        return schedules

    def makeEventTasks():
        for ev in body['events']:
            if ev['meta']['isCollective']:
                evSchedules = schedules
            else:
                evSchedules = [s for s in schedules
                        if s.forUser.id == ev['meta']['forUser']]
            if not evSchedules:
                logging.error('No schedules for event: ' + json.dumps(ev))
                continue

            invitees = list(UM.objects.filter(id__in=ev['data']['invitees']))
            if not invitees:
                logging.error('No invitees for event: ' + json.dumps(ev))
                continue

            rooms = list(CalendarResource.objects.filter(
                    id__in=ev['data']['locations']))
            d = datetime.datetime.strptime(ev['data']['date'],
                    '%Y-%m-%d').date()
            # [:5] drops seconds from 'HH:MM:SS' if present
            sTime = datetime.datetime.strptime(ev['data']['startTime'][:5],
                    '%H:%M').time()
            eTime = datetime.datetime.strptime(ev['data']['endTime'][:5],
                    '%H:%M').time()
            startDt = datetime.datetime.combine(d, sTime).replace(tzinfo=utc)
            endDt = datetime.datetime.combine(d, eTime).replace(tzinfo=utc)

            evTempl = None
            try:
                evTempl = EventTemplate.objects.get(
                        id=ev['data']['eventTemplate'])
            except EventTemplate.DoesNotExist as e:
                pass

            evTask = EventTask.objects.create(summary=ev['data']['summary'],
                    description=ev['data']['description'],
                    startDt=startDt, endDt=endDt, template=evTempl)
            evTask.locations.add(*rooms)
            evTask.attendees.add(*invitees)
            evTask.schedules.add(*evSchedules)
            enqueue(EVENT_TASK, evTask.id)

    try:
        UM = get_user_model()
        schedReq = SchedulingRequest.objects.get(id=modelId)
        body = schedReq.json
        schedTempl = ScheduleTemplate.objects.get(
            id=body['scheduleTemplate'])
        schedules = makeSchedules()
        makeEventTasks()
    except:
        exctype, value, tb = sys.exc_info()
        logging.error(str(exctype) + ' ' + str(value))
        traceback.print_tb(tb)

        failSchedulingRequest(modelId)


def processEventTask(modelId):
    evTask = EventTask.objects.get(id=modelId)
    try:
        schedules = evTask.schedules.all()
        if not schedules:
            logging.error('EventTask to create event for 0 schedules')
            return

        schedReq = schedules[0].schedulingRequest
        if schedReq.status != SchedulingRequest.IN_PROGRESS:
            logging.error('Drop EventTask because SchedulingRequest state is '
                    + schedReq.status)
            return

        rooms = evTask.locations.all()
        locTxt = ', '.join(r.name for r in rooms)
        attendingEmails = [u.email for u in evTask.attendees.all()]
        for r in rooms:
            attendingEmails.append(r.email)

        # TODO: exception handling, Google API retry logic, then
        # calling failSchedulingRequest(...)

        sleepForRateLimit()
        gCalJson = calendar.createEvent(calendar.futuintroCalId, False,
                evTask.summary, evTask.description,
                locTxt, evTask.startDt, evTask.endDt,
                schedules[0].template.timezone.name, attendingEmails)
        print(gCalJson)
    finally:
        evTask.delete()

def processCleanupSchedulingRequest(modelId):
    print('Cleanup Scheduling Request:', modelId)

def failSchedulingRequest(modelId):
    sr = SchedulingRequest.objects.get(id=modelId)
    sr.status = SchedulingRequest.ERROR
    sr.save()
    enqueue(CLEANUP_SCHED_REQ, modelId)


def sleepForRateLimit():
    """
    Optionally sleep depending on when we last made an API call.

    Checks when the most recent Google API call was made, optionally sleeps,
    updates the most recent call time to 'right now' then returns.
    Because of this logic, this function must only be called from a single
    thread (e.g. the single thread processing the task queue sequentially).
    """

    if not LastApiCall.objects.count():
        LastApiCall.objects.create()
        return

    now = datetime.datetime.utcnow().replace(tzinfo=utc)
    last = LastApiCall.objects.get()
    minDelta = datetime.timedelta(seconds=1)
    delta = now-last.dt
    if delta < minDelta:
        toSleep = minDelta - delta
        time.sleep(toSleep.seconds + toSleep.microseconds/1000000.)
    last.save()


SCHED_REQ = 'scheduling-request'
EVENT_TASK = 'event-task'
CLEANUP_SCHED_REQ = 'cleanup-scheduling-request'
implForName = {
        SCHED_REQ: processSchedulingRequest,
        EVENT_TASK: processEventTask,
        CLEANUP_SCHED_REQ: processCleanupSchedulingRequest,
}
