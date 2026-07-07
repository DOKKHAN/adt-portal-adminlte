from django.contrib import admin
from django.urls import path


admin.site.site_header = "A Darlo Todo Backoffice"
admin.site.site_title = "ADT Backoffice"
admin.site.index_title = "Gestion de roles y permisos"


urlpatterns = [
    path("", admin.site.urls),
]

