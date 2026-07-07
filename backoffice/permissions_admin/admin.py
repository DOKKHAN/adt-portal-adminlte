from django.contrib import admin

from .models import AppPermission, AppProfile, AppRolePermission


@admin.register(AppProfile)
class AppProfileAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("email", "full_name", "role")
    ordering = ("email",)
    fields = ("id", "email", "full_name", "role", "is_active")
    readonly_fields = ("id",)


@admin.register(AppPermission)
class AppPermissionAdmin(admin.ModelAdmin):
    list_display = ("key", "module", "action", "label")
    list_filter = ("module", "action")
    search_fields = ("key", "module", "action", "label", "description")
    ordering = ("module", "action", "key")


@admin.register(AppRolePermission)
class AppRolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission_key")
    list_filter = ("role",)
    search_fields = ("role", "permission_key")
    ordering = ("role", "permission_key")

