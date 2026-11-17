-- Plato — tabla de sincronización entre los móviles y el ordenador.
-- Ejecútalo una vez en Supabase: Project → SQL Editor → New query → pegar → Run.
--
-- Cada fila pertenece a una "casa" (household). La app envía el código de casa
-- en la cabecera x-household y las políticas RLS solo dejan leer y escribir las
-- filas de esa casa. Sin el código, la clave pública (anon) no ve nada.

create table if not exists public.plato_docs (
  id text primary key,
  household text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists plato_docs_household on public.plato_docs (household);

alter table public.plato_docs enable row level security;

create or replace function public.plato_household() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-household', '')
$$;

drop policy if exists plato_select on public.plato_docs;
create policy plato_select on public.plato_docs for select to anon
  using (length(household) >= 20 and household = public.plato_household());

drop policy if exists plato_insert on public.plato_docs;
create policy plato_insert on public.plato_docs for insert to anon
  with check (length(household) >= 20 and household = public.plato_household());

drop policy if exists plato_update on public.plato_docs;
create policy plato_update on public.plato_docs for update to anon
  using (household = public.plato_household())
  with check (household = public.plato_household());

grant select, insert, update on public.plato_docs to anon;
