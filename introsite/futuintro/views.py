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

def root(request):
    return render(request, 'futuintro/base.html')

def timezones(request):
    return render(request, 'futuintro/timezones.html')

def scheduleTemplateDetail(request, st_id):
    context = {'st_id': st_id}
    return render(request, 'futuintro/schedule-template-detail.html', context)

def newSchedulePage(request):
    return render(request, 'futuintro/new-schedule-page.html')
