-- Plato — importación desde el iPhone (Atajos) y fusión de pesajes en el servidor.
-- Se ejecuta después de plato.sql.

create extension if not exists pgcrypto with schema extensions;

-- ───────────── Códigos de importación personales ─────────────
-- Solo se guarda su huella (sha256); el código en claro se muestra una vez al crearlo.
create table if not exists public.plato_import_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person text not null check (person in ('fran', 'lua')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, person)
);
alter table public.plato_import_tokens enable row level security;

drop policy if exists plato_tokens_read on public.plato_import_tokens;
create policy plato_tokens_read on public.plato_import_tokens for select to authenticated using (user_id = auth.uid());
revoke all on public.plato_import_tokens from anon, authenticated;
grant select (id, person, created_at, last_used_at, user_id) on public.plato_import_tokens to authenticated;

-- Crea (o sustituye) el código del usuario para el plan de esa persona
create or replace function public.plato_create_import_token(p text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if not plato_can_view(p) then raise exception 'Sin permiso para ese plan'; end if;
  delete from plato_import_tokens where user_id = auth.uid() and person = p;
  t := 'plato_' || encode(gen_random_bytes(24), 'hex');
  insert into plato_import_tokens (user_id, person, token_hash) values (auth.uid(), p, encode(digest(t, 'sha256'), 'hex'));
  return t;
end $$;
revoke all on function public.plato_create_import_token(text) from public, anon;
grant execute on function public.plato_create_import_token(text) to authenticated;

create or replace function public.plato_revoke_import_token(p text) returns void
language sql security definer set search_path = public as $$
  delete from plato_import_tokens where user_id = auth.uid() and person = p
$$;
revoke all on function public.plato_revoke_import_token(text) from public, anon;
grant execute on function public.plato_revoke_import_token(text) to authenticated;

-- ───────────── Pesajes y medidas: nunca se pisan ─────────────
-- Une dos listas por "id" quedándose con la versión de "updatedAt" más reciente.
create or replace function public.plato_merge_list(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(x order by x ->> 'date', coalesce((x ->> 'updatedAt')::numeric, 0)), '[]'::jsonb)
  from (
    select distinct on (e ->> 'id') e as x
    from (
      select e from jsonb_array_elements(case when jsonb_typeof(a) = 'array' then a else '[]'::jsonb end) e
      union all
      select e from jsonb_array_elements(case when jsonb_typeof(b) = 'array' then b else '[]'::jsonb end) e
    ) s
    order by e ->> 'id', coalesce((e ->> 'updatedAt')::numeric, 0) desc
  ) t
$$;

create or replace function public.plato_docs_merge() returns trigger
language plpgsql as $$
begin
  if new.id like 'person:%' and old.data ? 'doc' and new.data ? 'doc' then
    new.data := jsonb_set(new.data, '{doc,weighIns}', plato_merge_list(old.data -> 'doc' -> 'weighIns', new.data -> 'doc' -> 'weighIns'));
    new.data := jsonb_set(new.data, '{doc,measures}', plato_merge_list(old.data -> 'doc' -> 'measures', new.data -> 'doc' -> 'measures'));
  end if;
  return new;
end $$;

drop trigger if exists plato_docs_merge on public.plato_docs;
create trigger plato_docs_merge before update on public.plato_docs
  for each row execute function public.plato_docs_merge();
