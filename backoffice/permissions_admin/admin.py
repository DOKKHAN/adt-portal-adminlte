from django.contrib import admin
from django.contrib.auth.models import Group, User

from .models import AppPermission, AppProfile, AppRolePermission, SupabaseAuthUser


admin.site.unregister(User)
admin.site.unregister(Group)


@admin.register(AppProfile)
class AppProfileAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("email", "full_name", "role")
    ordering = ("email",)
    fields = ("id", "email", "full_name", "role", "is_active")
    readonly_fields = ("id",)


@admin.register(SupabaseAuthUser)
class SupabaseAuthUserAdmin(admin.ModelAdmin):
    list_display = ("email", "phone", "created_at", "last_sign_in_at", "has_profile")
    search_fields = ("email", "phone", "id")
    ordering = ("email", "created_at")
    readonly_fields = (
        "id",
        "email",
        "phone",
        "created_at",
        "last_sign_in_at",
        "raw_user_meta_data",
    )
    fields = readonly_fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(boolean=True, description="Tiene perfil")
    def has_profile(self, obj):
        return AppProfile.objects.filter(id=obj.id).exists()


@admin.register(AppPermission)
class AppPermissionAdmin(admin.ModelAdmin):
    list_display = ("key", "module", "action", "label")
    list_filter = ("module", "action")
    search_fields = ("key", "module", "action", "label", "description")
    ordering = ("module", "action", "key")


@admin.register(AppRolePermission)
class AppRolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission")
    list_filter = ("role",)
    autocomplete_fields = ("permission",)
    search_fields = ("role", "permission__key", "permission__label", "permission__module")
    ordering = ("role", "permission")
