from django.conf.urls import include, patterns, url
from futuintro import views, apiviews


urlpatterns = patterns('',
    url(r'^$', views.root, name='root'),
    url(r'^ajax/$', views.ajax, name='ajax'),
    url(r'^api/', include(apiviews.router.urls)),
    url(r'^schedule-templates/', views.scheduleTemplates,
        name='schedule-templates'),
    url(r'^timezones/', views.timezones, name='timezones'),
)
