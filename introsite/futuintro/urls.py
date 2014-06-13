from django.conf.urls import include, patterns, url
from futuintro import views, apiviews


urlpatterns = patterns('',
    url(r'^$', views.root, name='root'),
    url(r'^ajax/$', views.ajax, name='ajax'),
    url(r'^api/', include(apiviews.router.urls)),
    url(r'^timezones/', views.timezones, name='timezones'),
    url(r'^schedule-templates/', views.scheduleTemplates,
        name='schedule-templates'),
    url(r'^schedule-template/(?P<st_id>\d+)/$', views.scheduleTemplateDetail,
        name='schedule-template-detail'),
    url(r'^new-schedule-page/', views.newSchedulePage,
        name='new-schedule-page'),
    url(r'^create-schedules/', views.createSchedules,
        name='create-schedules'),
    # TODO: improve the name for this 'scheduling-requests'
    url(r'^scheduling-requests/$', views.schedulingRequests,
        name='scheduling-requests'),
    url(r'^scheduling-request/(?P<sr_id>\d+)/$', views.schedulingRequestDetail,
        name='scheduling-request-detail'),
    url(r'^schedules/$', views.schedules, name='schedules'),
    url(r'^schedule/(?P<s_id>\d+)/$', views.scheduleDetail,
        name='schedule-detail'),
)
