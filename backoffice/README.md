# ADT Backoffice Django

Prototipo de backoffice interno para administrar perfiles, roles y permisos del portal ADT.

Este proyecto no reemplaza el portal estatico ni Supabase Auth. Su objetivo es dar una interfaz administrativa privada para mantener las tablas de permisos que el portal consume mediante `get_my_permissions()`.

## Responsabilidad

- Administrar perfiles de usuarios en `public.app_profiles`.
- Administrar permisos disponibles en `public.app_permissions`.
- Administrar la relacion rol-permiso en `public.app_role_permissions`.
- Mantener la autenticacion operativa del portal en Supabase Auth.

## Configuracion local

```powershell
cd backoffice
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py createsuperuser
python manage.py runserver
```

Configura `DATABASE_URL` en `.env` con la cadena Postgres de Supabase.

## Docker local

Desde la raiz del repositorio:

```powershell
docker compose -f docker-compose.backoffice.yml up -d --build adt-backoffice
docker compose -f docker-compose.backoffice.yml exec adt-backoffice python manage.py createsuperuser
docker compose -f docker-compose.backoffice.yml exec adt-backoffice python manage.py bootstrap_local_backoffice --with-sample-users
docker compose -f docker-compose.backoffice.yml exec adt-backoffice python manage.py sync_sidebar_permissions
docker compose -f docker-compose.backoffice.yml exec adt-backoffice python manage.py list_profiles
```

Luego entra a:

```text
http://localhost:8090/
```

Usa el superusuario creado con `createsuperuser`.

Para ver datos reales de Supabase, `DATABASE_URL` debe apuntar al Postgres de Supabase. Si queda vacio, Django usa SQLite local solo para pruebas del admin, pero no podra leer `app_profiles`, `app_permissions` ni `app_role_permissions` reales.

El comando `bootstrap_local_backoffice --with-sample-users` crea tablas y usuarios de demo solo cuando Django esta usando SQLite local.

## Variables

```env
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

## Seguridad

- No usar credenciales de Supabase en frontend.
- No versionar `.env`.
- La credencial Postgres o service role debe existir solo en el servidor Django.
- El portal debe seguir validando permisos con Supabase/RLS/RPC.

## Deploy sugerido

Desplegar como servicio separado, por ejemplo:

```text
portal qa2.adarlotodo.cl       -> Nginx estatico actual
backoffice admin.qa2.adarlotodo.cl -> Django privado
```
