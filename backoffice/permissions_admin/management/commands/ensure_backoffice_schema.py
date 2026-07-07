from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Ajustes minimos para que Django Admin pueda editar tablas existentes del portal."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            self.stdout.write(
                self.style.WARNING("Este comando solo aplica sobre PostgreSQL/Supabase.")
            )
            return

        with connection.cursor() as cursor:
            cursor.execute(
                """
                alter table public.app_role_permissions
                add column if not exists id bigserial
                """
            )
            cursor.execute(
                """
                do $$
                begin
                  if not exists (
                    select 1
                    from pg_constraint
                    where conrelid = 'public.app_role_permissions'::regclass
                      and contype = 'p'
                  ) then
                    alter table public.app_role_permissions
                    add constraint app_role_permissions_pkey primary key (id);
                  end if;
                end $$;
                """
            )
            cursor.execute(
                """
                create unique index if not exists app_role_permissions_role_permission_key
                on public.app_role_permissions(role, permission_key)
                """
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Esquema verificado: app_role_permissions tiene id y clave unica rol-permiso."
            )
        )

