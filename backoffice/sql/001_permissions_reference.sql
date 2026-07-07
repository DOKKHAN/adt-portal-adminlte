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

