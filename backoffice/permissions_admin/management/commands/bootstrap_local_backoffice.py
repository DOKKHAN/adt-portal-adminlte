from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

from permissions_admin.management.commands.sync_sidebar_permissions import SIDEBAR_PERMISSIONS
from permissions_admin.models import AppProfile, AppRolePermission


class Command(BaseCommand):
    help = "Crea tablas y datos de demo para probar el backoffice con SQLite local."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-sample-users",
            action="store_true",
            help="Crea perfiles de ejemplo para probar roles.",
        )

    def handle(self, *args, **options):
        if connection.vendor != "sqlite":
            self.stdout.write(
                self.style.WARNING(
                    "Este comando esta pensado para SQLite local. En Supabase usa sql/001_permissions_reference.sql."
                )
            )
            return

        with connection.cursor() as cursor:
            cursor.execute(
                """
                create table if not exists app_profiles (
                  id char(32) primary key,
                  email varchar(254) not null,
                  full_name varchar(255),
                  role varchar(80) not null,
                  is_active bool not null default 1
                )
                """
            )
            cursor.execute(
                """
                create table if not exists app_permissions (
                  key varchar(120) primary key,
                  module varchar(80),
                  action varchar(80),
                  label varchar(160),
                  description text
                )
                """
            )
            cursor.execute(
                """
                create table if not exists app_role_permissions (
                  id integer primary key autoincrement,
                  role varchar(80) not null,
                  permission_key varchar(120) not null,
                  unique (role, permission_key)
                )
                """
            )

        call_command("sync_sidebar_permissions")
        self.create_role_permissions()

        if options["with_sample_users"]:
            self.create_sample_users()

        self.stdout.write(self.style.SUCCESS("Backoffice local inicializado."))

    def create_role_permissions(self):
        role_permissions = {
            "admin": [
                "dashboard.view",
                "training.view",
                "students.view",
                "students.manage",
                "evaluations.view",
                "evaluations.manage",
                "routines.view",
                "routines.manage",
                "metrics.view",
                "reports.view",
                "financial_metrics.view",
                "inventory.view",
            ],
            "coach": [
                "dashboard.view",
                "training.view",
                "students.view",
                "evaluations.view",
                "routines.view",
            ],
            "viewer": [
                "dashboard.view",
                "training.view",
                "students.view",
                "metrics.view",
                "reports.view",
            ],
        }

        permissions_by_key = {item["key"] for item in SIDEBAR_PERMISSIONS}

        for role, permissions in role_permissions.items():
            for permission_key in permissions:
                if permission_key not in permissions_by_key:
                    continue

                AppRolePermission.objects.get_or_create(
                    role=role,
                    permission_id=permission_key,
                )

    def create_sample_users(self):
        sample_profiles = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "email": "owner@adarlotodo.cl",
                "full_name": "Owner ADT",
                "role": "owner",
                "is_active": True,
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "email": "coach@adarlotodo.cl",
                "full_name": "Coach ADT",
                "role": "coach",
                "is_active": True,
            },
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "email": "viewer@adarlotodo.cl",
                "full_name": "Viewer ADT",
                "role": "viewer",
                "is_active": True,
            },
        ]

        for profile in sample_profiles:
            AppProfile.objects.update_or_create(
                id=profile["id"],
                defaults={
                    "email": profile["email"],
                    "full_name": profile["full_name"],
                    "role": profile["role"],
                    "is_active": profile["is_active"],
                },
            )

