from django.conf.urls import patterns, url

from futuintro import views

urlpatterns = patterns('',
    url(r'^ajax/$', views.ajax, name='ajax')
)
