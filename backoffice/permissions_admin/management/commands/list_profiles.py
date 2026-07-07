from django.core.management.base import BaseCommand

from permissions_admin.models import AppProfile


class Command(BaseCommand):
    help = "Lista usuarios/perfiles ADT con rol y estado."

    def handle(self, *args, **options):
        profiles = AppProfile.objects.order_by("email")

        if not profiles.exists():
            self.stdout.write(self.style.WARNING("No hay perfiles en app_profiles."))
            return

        for profile in profiles:
            status = "activo" if profile.is_active else "inactivo"
            name = profile.full_name or "-"
            self.stdout.write(f"{profile.email} | {name} | {profile.role} | {status}")

