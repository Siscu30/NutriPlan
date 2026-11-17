-- Plato — accesos, datos y fotos privadas.
-- Ejecútalo una vez en Supabase: SQL Editor → New query → pegar → Run.
-- Después sigue los pasos de app/README.md (crear tu usuario y hacerte admin).

-- ───────────── Perfiles y permisos ─────────────
create table if not exists public.plato_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- Su propio plan (fran / lua) y los planes que puede ver
  person text check (person in ('fran', 'lua')),
  can_view text[] not null default '{}',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.plato_profiles enable row level security;

create or replace function public.plato_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plato_profiles where id = auth.uid() and role = 'admin' and status = 'approved')
$$;

-- ¿El usuario aprobado puede ver los datos de esa persona? (null = datos comunes)
create or replace function public.plato_can_view(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plato_profiles
    where id = auth.uid() and status = 'approved' and (p is null or p = any (can_view))
  )
$$;

-- Cada alta crea un perfil "pendiente"
create or replace function public.plato_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into plato_profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists plato_on_signup on auth.users;
create trigger plato_on_signup after insert on auth.users
  for each row execute function public.plato_on_signup();

drop policy if exists plato_profiles_read on public.plato_profiles;
create policy plato_profiles_read on public.plato_profiles for select to authenticated
  using (id = auth.uid() or public.plato_is_admin());

drop policy if exists plato_profiles_admin on public.plato_profiles;
create policy plato_profiles_admin on public.plato_profiles for update to authenticated
  using (public.plato_is_admin()) with check (public.plato_is_admin());

grant select, update on public.plato_profiles to authenticated;

-- El usuario marca que ya cambió su contraseña (solo puede tocar ese campo de su perfil)
create or replace function public.plato_password_changed() returns void
language sql security definer set search_path = public as $$
  update plato_profiles set must_change_password = false where id = auth.uid()
$$;
revoke all on function public.plato_password_changed() from public, anon;
grant execute on function public.plato_password_changed() to authenticated;

-- Solo desde el SQL Editor: convierte un usuario en administrador
create or replace function public.plato_make_admin(admin_email text) returns void
language sql security definer set search_path = public as $$
  update plato_profiles
  set role = 'admin', status = 'approved', person = 'fran', can_view = '{fran,lua}', must_change_password = true
  where lower(email) = lower(admin_email)
$$;
revoke all on function public.plato_make_admin(text) from public, anon, authenticated;

-- ───────────── Datos de la app ─────────────
create table if not exists public.plato_docs (
  id text primary key,
  person text check (person in ('fran', 'lua')),
  data jsonb not null,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.plato_docs enable row level security;

drop policy if exists plato_docs_read on public.plato_docs;
create policy plato_docs_read on public.plato_docs for select to authenticated
  using (public.plato_can_view(person));

drop policy if exists plato_docs_insert on public.plato_docs;
create policy plato_docs_insert on public.plato_docs for insert to authenticated
  with check (public.plato_can_view(person));

drop policy if exists plato_docs_update on public.plato_docs;
create policy plato_docs_update on public.plato_docs for update to authenticated
  using (public.plato_can_view(person)) with check (public.plato_can_view(person));

grant select, insert, update on public.plato_docs to authenticated;

-- Avisos en tiempo real (respetan las reglas de arriba)
do $$ begin
  alter publication supabase_realtime add table public.plato_docs;
exception when duplicate_object then null;
end $$;

-- ───────────── Fotos y páginas privadas ─────────────
insert into storage.buckets (id, name, public) values ('plato-media', 'plato-media', false)
on conflict (id) do update set public = false;

drop policy if exists plato_media_read on storage.objects;
create policy plato_media_read on storage.objects for select to authenticated
  using (bucket_id = 'plato-media' and public.plato_can_view(null));

drop policy if exists plato_media_insert on storage.objects;
create policy plato_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'plato-media' and public.plato_is_admin());

drop policy if exists plato_media_update on storage.objects;
create policy plato_media_update on storage.objects for update to authenticated
  using (bucket_id = 'plato-media' and public.plato_is_admin());
