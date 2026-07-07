import json
import urllib.error
import urllib.request

from django.contrib.auth import get_user_model

from permissions_admin.models import AppProfile


class SupabaseOwnerAuthBackend:
    """Authenticate Django admin users with Supabase Auth credentials.

    Only active profiles with role owner are granted Django staff/superuser access.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = (username or kwargs.get("email") or "").strip().lower()

        if not email or not password:
            return None

        supabase_user = self.authenticate_with_supabase(email, password)

        if not supabase_user:
            return None

        user_id = supabase_user.get("id")
        user_email = (supabase_user.get("email") or email).strip().lower()

        try:
            profile = AppProfile.objects.get(id=user_id, is_active=True, role="owner")
        except AppProfile.DoesNotExist:
            return None

        User = get_user_model()
        user, _ = User.objects.update_or_create(
            username=user_email,
            defaults={
                "email": user_email,
                "first_name": profile.full_name or "",
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.set_unusable_password()
        user.save(
            update_fields=[
                "email",
                "first_name",
                "is_active",
                "is_staff",
                "is_superuser",
                "password",
            ]
        )

        return user

    def get_user(self, user_id):
        User = get_user_model()

        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def authenticate_with_supabase(self, email, password):
        from django.conf import settings

        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            return None

        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
            return None

        return data.get("user")

