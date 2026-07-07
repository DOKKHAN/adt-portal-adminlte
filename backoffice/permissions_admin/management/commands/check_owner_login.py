import getpass

from django.core.management.base import BaseCommand

from backoffice.auth_backends import SupabaseOwnerAuthBackend
from permissions_admin.models import AppProfile


class Command(BaseCommand):
    help = "Prueba login Supabase Auth y acceso owner para el backoffice."

    def add_arguments(self, parser):
        parser.add_argument("email", help="Email del usuario Supabase Auth.")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = getpass.getpass("Password Supabase: ")
        backend = SupabaseOwnerAuthBackend()
        supabase_user = backend.authenticate_with_supabase(email, password)

        if not supabase_user:
            self.stdout.write(
                self.style.ERROR(
                    "Supabase no devolvio usuario. Revisa SUPABASE_URL, SUPABASE_ANON_KEY o password."
                )
            )
            return

        self.stdout.write(self.style.SUCCESS("Supabase Auth valido el usuario."))
        self.stdout.write(f"Supabase user id: {supabase_user.get('id')}")
        self.stdout.write(f"Supabase email: {supabase_user.get('email')}")

        try:
            profile = AppProfile.objects.get(id=supabase_user.get("id"))
        except AppProfile.DoesNotExist:
            self.stdout.write(self.style.ERROR("No existe perfil en public.app_profiles."))
            return

        self.stdout.write(f"Perfil: {profile.email} | {profile.full_name} | {profile.role} | active={profile.is_active}")

        if profile.role == "owner" and profile.is_active:
            self.stdout.write(self.style.SUCCESS("Acceso backoffice permitido."))
        else:
            self.stdout.write(
                self.style.ERROR("Acceso backoffice denegado: requiere role=owner e is_active=true.")
            )

