"""
Encapsulates task scheduling.

enqueue() submits a task, and tasks are processed sequentially, in the order
in which they are submitted.
The actual task queue implementation is encapsulated (and hidden) in this
module.

Task types are mapped to task implementations in the taskimpl module.
Those implementations are called sequentially.
"""

from django.db import models
import logging
import sys
import time

from futuintro import taskimpl
from futuintro.models import Task

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
    if taskType not in taskimpl.implForName:
        logging.error('Invalid task type ' + str(taskType))
        return
    handler = taskimpl.implForName[taskType]
    handler(modelId)


def loop():
    """
    Loop forever looking for tasks and processing them in order.
    """
    while True:
        try:
            if not Task.objects.count():
                time.sleep(5)
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
