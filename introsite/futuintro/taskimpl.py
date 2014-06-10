"""
Provides task implementations and maps task names to implementations.
"""

from futuintro import models

def processSchedulingRequest(modelId):
    schedReq = models.SchedulingRequest.objects.get(id=modelId)
    print(schedReq.json)


SCHED_REQ = 'scheduling-request'
implForName = {
        SCHED_REQ: processSchedulingRequest
}
