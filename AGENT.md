# AGENT.md — Contexto para Codex: Portal ADT AdminLTE + Supabase + Appsmith

## Objetivo del proyecto

Construir un nuevo portal web para **A Darlo Todo** en `qa2.adarlotodo.cl`, reemplazando gradualmente el login/portal creado dentro de Appsmith por un frontend propio basado en **AdminLTE 4**, servido desde **Nginx** y desplegado en **Coolify** mediante Docker Compose desde GitHub.

El portal debe mantener visualmente el login actual de ADT, autenticar contra **Supabase Auth**, construir un sidebar dinámico según roles/permisos del usuario y cargar módulos operativos existentes de **Appsmith** mediante iframes.

## Estado actual

Repositorio GitHub:

```text
https://github.com/DOKKHAN/adt-portal-adminlte
```

Ramas:

```text
main = rama actualmente desplegada por Coolify
qa   = rama inicial de trabajo
```

Dominio en Coolify:

```text
https://qa2.adarlotodo.cl
```

El contenedor ya levanta correctamente en Coolify y se encuentra healthy.

El login visual ya carga en `qa2.adarlotodo.cl` y el inicio de sesión contra Supabase Auth ya fue validado correctamente.

Actualmente, al ingresar, el portal muestra únicamente:

```text
Inicio
Rutinas
Alumnos
```

Eso indica que probablemente todavía se están usando permisos hardcodeados en `public/assets/js/portal.js`, específicamente algo como:

```js
currentPermissions = [
  "dashboard.view",
  "routines.create",
  "students.view"
];
```

El objetivo inmediato es reemplazar esa lógica por una consulta real a Supabase usando la función RPC `get_my_permissions()`.

## Stack técnico

- Frontend estático: HTML/CSS/JS
- UI: AdminLTE 4
- Servidor web: Nginx Alpine
- Deploy: Coolify
- Dominio: Cloudflare + Coolify/Traefik
- Auth: Supabase Auth
- Perfiles y permisos: tablas en Supabase
- Módulos internos: Appsmith embebido por iframe

## Estructura esperada del repo

```text
adt-portal-adminlte/
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── default.conf
└── public/
    ├── login.html
    ├── index.html
    └── assets/
        ├── css/
        │   └── custom.css
        ├── js/
        │   ├── auth.js
        │   ├── config.template.js
        │   ├── config.js   # generado en runtime, no versionar si aparece localmente
        │   └── portal.js
        └── img/
```

## Docker/Coolify

El deploy usa Docker Compose desde GitHub. El archivo `docker-compose.yml` no debe usar bind mounts para `public/` ni `nginx/default.conf`, porque eso falló en Coolify con un error de mount file/directory.

La solución actual usa un `Dockerfile` que copia los archivos dentro de la imagen.

El `Dockerfile` esperado es similar a:

```dockerfile
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 80
```

El `docker-compose.yml` esperado es similar a:

```yaml
services:
  adt-portal-adminlte:
    build:
      context: .
      dockerfile: Dockerfile

    restart: unless-stopped

    expose:
      - "80"

    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      APP_ENV: ${APP_ENV:-qa}

    command: >
      /bin/sh -c "
      envsubst < /usr/share/nginx/html/assets/js/config.template.js > /usr/share/nginx/html/assets/js/config.js &&
      nginx -g 'daemon off;'
      "

    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

Variables de entorno configuradas en Coolify:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
APP_ENV=qa
```

No usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.

## Supabase: modelo de roles y permisos

Se planea usar estas tablas:

```sql
public.app_profiles
public.app_permissions
public.app_role_permissions
```

Y esta función RPC:

```sql
public.get_my_permissions()
```

La función esperada:

```sql
create or replace function public.get_my_permissions()
returns table (
  email text,
  full_name text,
  role text,
  is_active boolean,
  permission_key text
)
language sql
security definer
set search_path = public
as $$
  select
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    rp.permission_key
  from public.app_profiles p
  join public.app_role_permissions rp
    on rp.role = p.role
  where p.id = auth.uid()
    and p.is_active = true;
$$;
```

Roles iniciales:

```text
owner
admin
coach
viewer
```

Permisos iniciales:

```text
dashboard.view
students.view
students.manage
evaluations.create
routines.create
routines.view
reports.view
financial_metrics.view
users.manage
settings.manage
```

## Requisito funcional inmediato

Modificar `public/assets/js/portal.js` para que el sidebar se construya desde permisos reales devueltos por:

```js
await supabase.rpc("get_my_permissions")
```

No debe seguir usando permisos hardcodeados.

La lógica esperada dentro de `initPortal()`:

1. Validar sesión con `supabase.auth.getSession()`.
2. Si no hay sesión, redirigir a `/login.html`.
3. Llamar a `supabase.rpc("get_my_permissions")`.
4. Si hay error, mostrarlo en consola y redirigir al login.
5. Si no retorna permisos, cerrar sesión y redirigir al login.
6. Mostrar `full_name/email · role` en `#userInfo`.
7. Poblar `currentPermissions` con los `permission_key`.
8. Renderizar el sidebar dinámico.

Ejemplo de bloque esperado:

```js
const { data: permissionsData, error: permissionsError } = await supabase.rpc("get_my_permissions");

if (permissionsError) {
  console.error("Error obteniendo permisos:", permissionsError);
  window.location.href = "/login.html";
  return;
}

if (!permissionsData || permissionsData.length === 0) {
  console.warn("Usuario sin permisos o inactivo.");
  await supabase.auth.signOut();
  window.location.href = "/login.html";
  return;
}

const profile = permissionsData[0];

document.getElementById("userInfo").textContent =
  `${profile.full_name || profile.email} · ${profile.role}`;

currentPermissions = permissionsData.map((row) => row.permission_key);
```

## Sidebar esperado

El sidebar debe renderizar opciones según permisos.

Módulos esperados inicialmente:

```js
const modules = {
  home: {
    title: "Inicio",
    permission: "dashboard.view",
    url: null
  },
  routines: {
    title: "Rutinas",
    permission: "routines.create",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  students: {
    title: "Alumnos",
    permission: "students.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  evaluations: {
    title: "Evaluaciones",
    permission: "evaluations.create",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  reports: {
    title: "Reportes",
    permission: "reports.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  financial: {
    title: "Métricas financieras",
    permission: "financial_metrics.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  users: {
    title: "Usuarios",
    permission: "users.manage",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  settings: {
    title: "Configuración",
    permission: "settings.manage",
    url: null
  }
};
```

Para un usuario `owner`, deberían aparecer al menos:

```text
Inicio
Rutinas
Alumnos
Evaluaciones
Reportes
Métricas financieras
Usuarios
Configuración
```

Para un usuario `viewer`, deberían aparecer muchos menos módulos.

## Seguridad

Importante: ocultar opciones del sidebar no es seguridad suficiente. Es solo UX/control de navegación. La seguridad real debe seguir en:

- Supabase RLS
- Permisos Appsmith
- Separación de apps sensibles
- Validaciones dentro de módulos sensibles

No pasar roles por query params como fuente de verdad. Si se pasa email/user id al iframe, debe usarse solo como contexto UX, no como control de seguridad.

## AdminLTE

Actualmente el proyecto carga AdminLTE 4 desde CDN en `index.html`. Sin embargo, la implementación todavía es bastante básica. Hay que mejorar el layout para usar mejor componentes de AdminLTE:

- Sidebar con iconos
- Navbar superior
- Cards de inicio
- Alertas AdminLTE/Bootstrap para errores
- Mejor estructura responsive
- Estado activo del menú
- Opcional: Bootstrap Icons desde CDN

No es necesario migrar todo de una vez. Prioridad actual: permisos reales.

## Problema observado actualmente

Aunque el usuario tiene rol `owner`, solo se ven 3 opciones en el sidebar. Esto indica que una de estas cosas está pasando:

1. `portal.js` sigue usando permisos hardcodeados.
2. Coolify no desplegó el último commit.
3. El navegador está cacheando `portal.js` antiguo.
4. `get_my_permissions()` no existe o retorna vacío, pero no se está usando todavía.
5. El repo desplegado es `main` y los cambios fueron empujados a otra rama.

Validaciones sugeridas:

- Abrir `https://qa2.adarlotodo.cl/assets/js/portal.js` y buscar si todavía existe `currentPermissions = [...]` hardcodeado.
- Revisar en Coolify cuál es el commit desplegado.
- Hacer redeploy después del push a `main`.
- Forzar recarga con `Ctrl + F5`.
- Agregar temporalmente `console.log("permissionsData", permissionsData)` para depurar.

## Flujo de trabajo Git/Coolify

Coolify está desplegando desde `main`.

Comandos recomendados:

```powershell
git checkout main
git status
git add .
git commit -m "Load sidebar permissions from Supabase RPC"
git push origin main
```

Después, en Coolify:

```text
Deploy
```

Si se cambió `docker-compose.yml`, usar también:

```text
Reload Compose File
Save
Deploy
```

Si solo se cambió JS/CSS/HTML, basta con:

```text
Deploy
```

Después en navegador:

```text
Ctrl + F5
```

## Tareas para Codex

1. Revisar `public/assets/js/portal.js`.
2. Eliminar permisos hardcodeados.
3. Integrar `supabase.rpc("get_my_permissions")`.
4. Agregar logs de depuración temporales y claros:
   - sesión activa
   - permissionsData
   - currentPermissions
   - módulos permitidos
5. Asegurar que un owner vea todos los módulos.
6. Agregar `settings` y `evaluations/reports` si faltan.
7. Mejorar sidebar con clases compatibles con AdminLTE 4.
8. Mantener el flujo de iframe para Appsmith.
9. No introducir framework ni build step todavía.
10. No exponer secretos privados.

## Definición de terminado

Se considera terminado este bloque cuando:

- Login en `qa2.adarlotodo.cl` sigue funcionando.
- `portal.js` consulta `get_my_permissions()`.
- Usuario `owner` ve todos los módulos esperados.
- Usuario `viewer` ve solo módulos permitidos.
- Usuario `is_active=false` es enviado al login.
- Coolify despliega desde `main` sin errores.
- El contenedor queda healthy.
