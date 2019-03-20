from django.conf.urls import include, url
from futuschedule import views, apiviews


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^api/', include(apiviews.router.urls)),
    url(r'^timezones/', views.timezones, name='timezones'),
    url(r'^calendars/', views.calendars, name='calendars'),
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
    url(r'^add-users-to-schedule/(?P<sr_id>\d+)/$', views.addUsersToSchedule, name='add-users-to-schedule'),
    url(r'^remove-users-from-schedule/(?P<sr_id>\d+)/$', views.deleteUsersFromSchedule, name='remove-users-from-schedule'),
    url(r'^generate-pdf/(?P<sr_id>\d+)/$', views.generatePdf, name='generate-pdf'),
    url(r'^test/', views.test, name='test'),
    url(r'^copy-schedule-template/(?P<st_id>\d+)/$', views.copyScheduleTemplate, name='copy-schedule-template'),
]
