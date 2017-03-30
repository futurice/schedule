from django.conf.urls import include, url
from django.contrib import admin

import futuschedule.urls

admin.autodiscover()

urlpatterns = [
    url(r'^admin/', include(admin.site.urls)),
    url(r'^', include(futuschedule.urls)),
]
