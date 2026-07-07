# Backoffice Django en Coolify

URL definida para QA:

```text
https://backoffice.qa2.adarlotodo.cl
```

## Cloudflare

Crear un registro DNS para:

```text
backoffice.qa2.adarlotodo.cl
```

Apuntarlo al mismo destino que usa Coolify para `qa2.adarlotodo.cl`.

Recomendacion inicial:

```text
Proxy status: Proxied
SSL/TLS: Full o Full strict, segun certificado del origen
```

## Coolify

Crear una aplicacion separada desde GitHub:

```text
Repository: DOKKHAN/adt-portal-adminlte
Branch: codex/django-backoffice-prototype
Build Pack: Dockerfile
Base Directory: /backoffice
Port: 8000
Domain: https://backoffice.qa2.adarlotodo.cl
```

Variables:

```env
DJANGO_SECRET_KEY=valor-largo-y-privado
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=backoffice.qa2.adarlotodo.cl
DJANGO_CSRF_TRUSTED_ORIGINS=https://backoffice.qa2.adarlotodo.cl
DATABASE_URL=postgresql://USER:PASSWORD@HOST_INTERNO_SUPABASE:5432/postgres?sslmode=require
```

## Comandos post-deploy

Ejecutar desde la terminal del contenedor en Coolify:

```bash
python manage.py createsuperuser
python manage.py sync_sidebar_permissions
python manage.py list_profiles
```

## Nota sobre DATABASE_URL

Si el backoffice corre dentro de Coolify y Supabase tambien esta en la misma infraestructura, usa el host interno o el nombre del servicio Postgres de Supabase, no el dominio web `https://supabase.adarlotodo.cl`.

El dominio `supabase.adarlotodo.cl` sirve API/Studio por HTTP(S), no es una conexion PostgreSQL directa para Django.
