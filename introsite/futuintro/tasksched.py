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
        DeletionTask, LastApiCall)
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
            logging.error(traceback.format_exc())


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
        enqueue(MARK_SCHED_REQ_SUCCESS, modelId)
    except:
        logging.error(traceback.format_exc())
        failSchedulingRequest(modelId, traceback.format_exc())


def processEventTask(modelId):
    evTask = EventTask.objects.get(id=modelId)
    schedReq = None
    try:
        schedules = evTask.schedules.all()
        if not schedules:
            raise Exception('EventTask to create event for 0 schedules')

        schedReq = schedules[0].schedulingRequest
        if schedReq.status != SchedulingRequest.IN_PROGRESS:
            logging.info('Drop EventTask: SchedulingRequest status is '
                    + schedReq.status)
            return

        rooms = evTask.locations.all()
        locTxt = ', '.join(r.name for r in rooms)
        attendingEmails = [u.email for u in evTask.attendees.all()]
        for r in rooms:
            attendingEmails.append(r.email)

        # TODO: exception handling, Google API retry logic

        schedTempl = schedules[0].template
        if not schedTempl:
            raise Exception('Drop EventTask because schedule template was ' +
                    'deleted and we can\'t find out the timezone')

        sleepForRateLimit()
        gCalJson = calendar.createEvent(calendar.futuintroCalId, False,
                evTask.summary, evTask.description,
                locTxt, evTask.startDt, evTask.endDt,
                schedTempl.timezone.name, attendingEmails)
        newEv = Event.objects.create(json=gCalJson, template=evTask.template)
        newEv.schedules.add(*schedules)
    except:
        logging.error(traceback.format_exc())
        if schedReq:
            failSchedulingRequest(schedReq.id, traceback.format_exc())
    finally:
        evTask.delete()


def processMarkSchedReqSuccess(modelId):
    """
    Mark scheduling request status as SUCCESS if status is IN_PROGRESS.

    This gets submitted after all the event creation tasks. When this runs,
    if the scheduling request's status is still marked as in progress, than
    everything ran successfully so far and didn't mark it as failed, so this
    task sets it as successful. Otherwise this task does nothing.
    """
    schReq = SchedulingRequest.objects.get(id=modelId)
    if schReq.status == SchedulingRequest.IN_PROGRESS:
        schReq.status = SchedulingRequest.SUCCESS
        schReq.save()


def processCleanupSchedulingRequest(modelId):
    """
    Delete what got created in Google Calendar, our Events and Schedules.

    Either something went wrong or the user decided to delete an entire
    scheduling request. In either case, this task is set to roll-back and
    delete objects.
    """
    schReq = SchedulingRequest.objects.get(id=modelId)
    for schedule in schReq.schedule_set.all():
        for event in schedule.event_set.all():
            sleepForRateLimit()
            try:
                calendar.deleteEvent(calendar.futuintroCalId, event.json['id'])
            except:
                logging.error(traceback.format_exc())
            event.delete()
        schedule.delete()

def failSchedulingRequest(modelId, errTxt=''):
    sr = SchedulingRequest.objects.get(id=modelId)
    # allow this function to be called multiple times
    if sr.status != SchedulingRequest.ERROR:
        sr.status = SchedulingRequest.ERROR
        if errTxt:
            sr.error = errTxt
        sr.save()
        enqueue(CLEANUP_SCHED_REQ, modelId)


def processDeletionTask(modelId):
    """
    Process the user's request to delete a scheduling request.

    This may come in at any point (while still processing the scheduling
    request, after completing with success or after failing with an error).
    """
    deleteTask = DeletionTask.objects.get(id=modelId)
    try:
        if not deleteTask.schedReq:
            logging.warning('Found task to delete a scheduling request ' +
                    'which doesn\'t exist (anymore).')
            return
        user = deleteTask.requestedByUser
        logging.info('Deleting a scheduling request, as requested by ' +
                (user.username if user else 'Unknown User') + ' at ' +
                str(deleteTask.requestedAt))
        failSchedulingRequest(deleteTask.schedReq.id,
                'Deleting, as requested by user')
        enqueue(DELETE_SCHED_REQ, deleteTask.schedReq.id)
    finally:
        deleteTask.delete()


def processDeleteSchedulingRequest(modelId):
    sr = SchedulingRequest.objects.get(id=modelId)
    sr.delete()


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
MARK_SCHED_REQ_SUCCESS = 'mark-scheduling-request-successful'
CLEANUP_SCHED_REQ = 'cleanup-scheduling-request'
DELETION_TASK = 'deletion-task'
DELETE_SCHED_REQ = 'delete-scheduling-request'
implForName = {
        SCHED_REQ: processSchedulingRequest,
        EVENT_TASK: processEventTask,
        MARK_SCHED_REQ_SUCCESS: processMarkSchedReqSuccess,
        CLEANUP_SCHED_REQ: processCleanupSchedulingRequest,
        DELETION_TASK: processDeletionTask,
        DELETE_SCHED_REQ: processDeleteSchedulingRequest,
}
