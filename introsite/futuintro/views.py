from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json

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
