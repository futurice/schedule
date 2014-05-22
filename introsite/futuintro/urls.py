from django.conf.urls import include, patterns, url
from futuintro import views, apiviews


urlpatterns = patterns('',
    url(r'^ajax/$', views.ajax, name='ajax'),
    url(r'^api/', include(apiviews.router.urls)),
)
