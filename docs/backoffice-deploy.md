# Backoffice Django en Coolify

URL definida para QA:

```text
https://backoffice.adarlotodo.cl
```

## Cloudflare

Crear un registro DNS para:

```text
backoffice.adarlotodo.cl
```

Apuntarlo al mismo destino que usa Coolify para `qa2.adarlotodo.cl`.

Recomendacion inicial:

```text
Proxy status: Proxied
SSL/TLS: Full o Full strict, segun certificado del origen
```

## Coolify

Crear una aplicacion separada desde GitHub. Para que el backoffice quede conectado
siempre a la red interna de Supabase, usar Docker Compose con el archivo
`docker-compose.backoffice.yml`.

```text
Repository: DOKKHAN/adt-portal-adminlte
Branch: codex/django-backoffice-prototype
Build Pack: Docker Compose
Docker Compose File: docker-compose.backoffice.yml
Port: 8000
Domain: https://backoffice.adarlotodo.cl
```

Variables:

```env
DJANGO_SECRET_KEY=valor-largo-y-privado
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=backoffice.adarlotodo.cl
DJANGO_CSRF_TRUSTED_ORIGINS=https://backoffice.adarlotodo.cl
DATABASE_URL=postgresql://USER:PASSWORD@supabase-db:5432/postgres
DATABASE_SSL_REQUIRE=False
SUPABASE_URL=https://supabase.adarlotodo.cl
SUPABASE_ANON_KEY=anon-key-publica
ALLOW_SQLITE_FALLBACK=False
```

## Comandos post-deploy

Ejecutar desde la terminal del contenedor en Coolify:

```bash
python manage.py sync_sidebar_permissions
python manage.py list_profiles
python manage.py check_owner_login cristi.diego@gmail.com
```

Los usuarios `owner` activos pueden iniciar sesion en el backoffice con sus credenciales de Supabase Auth. Django valida el password contra Supabase y luego exige que exista un perfil activo en `public.app_profiles` con `role = 'owner'`.

Para editar `Permisos por rol` desde Django Admin, la tabla `public.app_role_permissions`
debe tener una columna `id` como clave primaria. Si no existe, ejecutar desde Supabase
SQL Editor con un usuario dueno de la tabla:

```sql
alter table public.app_role_permissions
add column if not exists id bigserial;

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

create unique index if not exists app_role_permissions_role_permission_key
on public.app_role_permissions(role, permission_key);
```

No se ejecuta automaticamente al iniciar porque algunas instalaciones de Supabase
crean las tablas con otro owner y rechazan `ALTER TABLE` desde el usuario de conexion
del backoffice.

## Nota sobre DATABASE_URL

Si el backoffice corre dentro de Coolify y Supabase tambien esta en la misma infraestructura, usa el host interno o el nombre del servicio Postgres de Supabase, no el dominio web `https://supabase.adarlotodo.cl`.

El dominio `supabase.adarlotodo.cl` sirve API/Studio por HTTP(S), no es una conexion PostgreSQL directa para Django.

Si ves un error como `no such table: auth.users` y el traceback menciona `django/db/backends/sqlite3`, significa que el backoffice no esta usando Supabase. En Coolify falta `DATABASE_URL` o esta vacio.

Si ves `server does not support SSL, but SSL was required`, estas conectando por la red interna Docker a Postgres. Usa `DATABASE_SSL_REQUIRE=False` y quita `?sslmode=require` del `DATABASE_URL`.

Si ves `failed to resolve host 'supabase-db...'`, el contenedor no esta conectado
a la red Docker de Supabase. Este repo espera la red externa:

```text
yeevzr44tt5s3psxfezsn46m
```

Por eso el backoffice debe desplegarse con `docker-compose.backoffice.yml` o,
si se usa Dockerfile puro en Coolify, se debe conectar manualmente ese recurso
a la misma red desde la configuracion de Coolify.
