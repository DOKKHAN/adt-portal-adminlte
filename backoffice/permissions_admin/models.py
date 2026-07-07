import uuid

from django.db import models


class AppProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    email = models.EmailField()
    full_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "app_profiles"
        verbose_name = "perfil de usuario"
        verbose_name_plural = "perfiles de usuario"

    def __str__(self):
        return f"{self.full_name or self.email} ({self.role})"


class AppPermission(models.Model):
    key = models.CharField(primary_key=True, max_length=120)
    module = models.CharField(max_length=80, blank=True, null=True)
    action = models.CharField(max_length=80, blank=True, null=True)
    label = models.CharField(max_length=160, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "app_permissions"
        verbose_name = "permiso"
        verbose_name_plural = "permisos"
        ordering = ["module", "action", "key"]

    def __str__(self):
        return self.label or self.key


class AppRolePermission(models.Model):
    id = models.BigAutoField(primary_key=True)
    role = models.CharField(max_length=80)
    permission_key = models.CharField(max_length=120)

    class Meta:
        managed = False
        db_table = "app_role_permissions"
        verbose_name = "permiso por rol"
        verbose_name_plural = "permisos por rol"
        ordering = ["role", "permission_key"]

    def __str__(self):
        return f"{self.role} -> {self.permission_key}"

