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

## AdminLTE local

AdminLTE 4 esta instalado por npm junto a Bootstrap 5, Popper y Bootstrap Icons.

Codex puede consultar:

```text
node_modules/admin-lte
public/vendor/adminlte
public/vendor/bootstrap
public/vendor/bootstrap-icons
```

Los assets publicos se sirven desde:

```text
public/vendor/
```

Reglas:

- No modificar archivos dentro de `public/vendor/` salvo actualizacion explicita de vendor.
- Para actualizar vendor, instalar/actualizar dependencias npm y ejecutar `npm run vendor:copy`.
- Mantener cache busting en HTML para CSS/JS con `?v=...`.
- Mantener HTML/CSS/JS puro. No introducir React, Vue, Angular ni build step.
- Usar componentes AdminLTE/Bootstrap para sidebar, navbar, cards, alerts, badges, buttons, tables, forms y modals.
- Usar Bootstrap JS local desde `/vendor/bootstrap/js/bootstrap.bundle.min.js` para dropdowns, modals y otros componentes interactivos.
- Usar Bootstrap Icons desde `/vendor/bootstrap-icons/bootstrap-icons.css`.

Guia local:

```text
docs/adminlte-component-guide.md
```

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


## Política de caché y cache busting en QA

Se detectó un problema específico en Brave: Firefox cargaba correctamente la versión nueva de `portal.js`, pero Brave seguía mostrando el sidebar antiguo incluso en incógnito. El diagnóstico final fue que el archivo nuevo existía en el servidor, pero el navegador/edge seguía usando una importación sin versionar desde `index.html`.

Validación usada:

```text
https://qa2.adarlotodo.cl/assets/js/portal.js?v=test123
```

Si al abrir esa URL aparece la versión nueva con `get_my_permissions`, significa que el archivo correcto existe y el problema está en la carga/cache del HTML o de la importación del módulo JS.

### Regla obligatoria para Codex

Cada vez que se modifiquen archivos frontend importados por HTML, especialmente:

```text
public/assets/js/portal.js
public/assets/js/auth.js
public/assets/css/custom.css
```

Codex debe actualizar también el query param de versión en los archivos HTML correspondientes.

Ejemplo en `public/index.html`:

```html
<script type="module" src="/assets/js/portal.js?v=20260611-roles-v2"></script>
```

Ejemplo en `public/login.html`:

```html
<script type="module" src="/assets/js/auth.js?v=20260611-roles-v2"></script>
```

Ejemplo para CSS si aplica:

```html
<link rel="stylesheet" href="/assets/css/custom.css?v=20260611-roles-v2">
```

No dejar imports críticos sin versión, por ejemplo evitar:

```html
<script type="module" src="/assets/js/portal.js"></script>
```

### Convención sugerida de versiones

Usar una versión explícita y creciente por cambio funcional:

```text
v=20260611-roles-v2
v=20260611-sidebar-icons-v1
v=20260612-login-ui-v1
v=20260612-permissions-fix-v1
```

No es necesario que sea semver formal en QA, pero debe cambiar cada vez que cambie el archivo importado.

### Política de Nginx para QA

Para `qa2.adarlotodo.cl`, mientras el portal esté en desarrollo, se recomienda evitar caché agresiva. En `nginx/default.conf` se puede usar:

```nginx
add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
add_header Pragma "no-cache" always;
add_header Expires "0" always;
```

Esto es especialmente útil para HTML, JS y CSS durante iteraciones rápidas.

### Cloudflare

Para QA, se recomienda crear una Cache Rule en Cloudflare:

```text
Hostname equals qa2.adarlotodo.cl
→ Bypass cache
```

Si hay dudas durante una validación, purgar manualmente:

```text
https://qa2.adarlotodo.cl/index.html
https://qa2.adarlotodo.cl/login.html
https://qa2.adarlotodo.cl/assets/js/portal.js
https://qa2.adarlotodo.cl/assets/js/auth.js
https://qa2.adarlotodo.cl/assets/css/custom.css
```

En QA también es aceptable usar `Purge Everything` si se sospecha caché intermedia.

### Checklist post-deploy obligatorio

Después de cada deploy en Coolify:

1. Confirmar en los logs de Coolify que se desplegó el commit correcto:

```text
Importing DOKKHAN/adt-portal-adminlte:main (commit sha XXXXX)
```

Ese SHA debe coincidir con:

```powershell
git log --oneline -1
```

2. Validar el archivo servido con versión:

```text
https://qa2.adarlotodo.cl/assets/js/portal.js?v=VERSION_NUEVA
```

3. Si se cambió `index.html`, validar el source:

```text
view-source:https://qa2.adarlotodo.cl/index.html?v=VERSION_NUEVA
```

y confirmar que apunta al JS/CSS con la versión nueva.

4. En navegador, recargar con:

```text
Ctrl + Shift + R
```

5. Si Brave muestra comportamiento distinto a Firefox, revisar primero caché/versionado antes de culpar a Supabase, Coolify o permisos.

### Diagnóstico importante

Si `portal.js?v=algo-nuevo` muestra el código actualizado, pero el portal sigue comportándose como antes, el problema suele estar en `index.html` cargando una URL sin versión o en caché intermedia.

La solución preferida es:

```text
versionar scripts/CSS en HTML
+
desactivar caché en Nginx para QA
+
bypass cache en Cloudflare para qa2.adarlotodo.cl
```

No modificar lógica de Supabase ni roles/permisos hasta descartar primero cache de frontend.
