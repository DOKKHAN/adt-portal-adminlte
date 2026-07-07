-- Referencia para revisar o crear la estructura esperada en Supabase.
-- Ejecutar manualmente desde Supabase SQL Editor si alguna tabla no existe.

create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null,
  is_active boolean not null default true
);

create table if not exists public.app_permissions (
  key text primary key,
  module text,
  action text,
  label text,
  description text
);

create table if not exists public.app_role_permissions (
  id bigserial primary key,
  role text not null,
  permission_key text not null references public.app_permissions(key) on delete cascade,
  unique (role, permission_key)
);

create index if not exists app_profiles_role_idx on public.app_profiles(role);
create index if not exists app_role_permissions_role_idx on public.app_role_permissions(role);

insert into public.app_permissions (key, module, action, label, description)
values
  ('dashboard.view', 'Inicio', 'view', 'Inicio', 'Ver el inicio del portal'),
  ('students.view', 'Alumnos', 'view', 'Alumnos: ver', 'Ver el modulo de alumnos'),
  ('students.manage', 'Alumnos', 'manage', 'Alumnos: editar', 'Crear o editar alumnos'),
  ('evaluations.create', 'Evaluaciones', 'create', 'Evaluaciones: crear', 'Crear evaluaciones'),
  ('routines.create', 'Rutinas', 'create', 'Rutinas: crear', 'Crear rutinas'),
  ('routines.view', 'Rutinas', 'view', 'Rutinas: ver', 'Ver el modulo de rutinas'),
  ('reports.view', 'Reportes', 'view', 'Reportes', 'Ver el menu Reportes'),
  ('financial_metrics.view', 'Metricas financieras', 'view', 'Metricas financieras', 'Ver metricas financieras')
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  label = excluded.label,
  description = excluded.description;

insert into public.app_role_permissions (role, permission_key)
select 'owner', p.key
from public.app_permissions p
where p.key in (
  'dashboard.view',
  'students.view',
  'students.manage',
  'evaluations.create',
  'routines.create',
  'routines.view',
  'reports.view',
  'financial_metrics.view'
)
on conflict (role, permission_key) do nothing;
