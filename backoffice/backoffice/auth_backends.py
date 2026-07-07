import json
import logging
import urllib.error
import urllib.request

from django.contrib.auth import get_user_model

from permissions_admin.models import AppProfile


logger = logging.getLogger(__name__)


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
            logger.warning("Supabase owner auth failed for %s: Supabase did not return a user.", email)
            return None

        user_id = supabase_user.get("id")
        user_email = (supabase_user.get("email") or email).strip().lower()

        try:
            profile = AppProfile.objects.get(id=user_id, is_active=True, role="owner")
        except AppProfile.DoesNotExist:
            logger.warning(
                "Supabase owner auth denied for %s: active owner profile not found.",
                user_email,
            )
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
            logger.error("Supabase owner auth is not configured: SUPABASE_URL or SUPABASE_ANON_KEY is missing.")
            return None

        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            logger.warning(
                "Supabase owner auth HTTP error for %s: status=%s body=%s",
                email,
                error.code,
                body[:500],
            )
            return None
        except (TimeoutError, urllib.error.URLError) as error:
            logger.warning("Supabase owner auth request failed for %s: %s", email, error)
            return None
        except json.JSONDecodeError as error:
            logger.warning("Supabase owner auth returned invalid JSON for %s: %s", email, error)
            return None

        return data.get("user")
