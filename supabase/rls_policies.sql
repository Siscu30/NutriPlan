-- NutriPlan — RLS y RPC de escritura protegida por PIN
--
-- ⚠️ NO SE HA APLICADO AUTOMÁTICAMENTE. Este archivo es una propuesta.
-- Léelo junto con docs/security-rls.md antes de ejecutarlo en el SQL Editor
-- de Supabase (Project → SQL Editor → New query → pegar → Run).
--
-- Qué hace:
--   - Deja SELECT abierto en nutriplan_state (igual que hoy) para que
--     Supabase Realtime (postgres_changes) siga funcionando sin cambios.
--   - Bloquea INSERT/UPDATE/DELETE directos contra la tabla para cualquiera
--     que solo tenga la anon key pública.
--   - Expone la única vía de escritura a través de rpc_save_state(pin, data),
--     que valida un PIN compartido (hasheado con pgcrypto) antes de escribir,
--     con lockout temporal tras 5 intentos fallidos.
--
-- Qué rompe si lo aplicas sin más:
--   - El index.html actual escribe con `sb.from('nutriplan_state').upsert(...)`
--     directamente (js/sync.js tras la modularización). Esa llamada empezará
--     a fallar (403 / new row violates row-level security policy) hasta que
--     el cliente se actualice para llamar a `sb.rpc('rpc_save_state', {p_pin, p_data})`
--     en su lugar. Ese cambio de cliente es del Sprint 2 y requiere tu
--     confirmación explícita (checkpoint sensible) antes de aplicarse.

begin;

create extension if not exists pgcrypto;

-- ============ Tabla de estado compartido (ya existente) ============
-- Se asume el esquema actual: id smallint/int PK, data jsonb, updated_at timestamptz.

alter table public.nutriplan_state enable row level security;

drop policy if exists "nutriplan_state_read" on public.nutriplan_state;
create policy "nutriplan_state_read"
  on public.nutriplan_state
  for select
  to anon, authenticated
  using (true);

-- Sin políticas de INSERT/UPDATE/DELETE para anon/authenticated → RLS las
-- deniega todas por defecto. La única vía de escritura es rpc_save_state.
-- Cinturón y tirantes: revocamos también los privilegios de tabla directos.
revoke insert, update, delete on public.nutriplan_state from anon, authenticated;
grant select on public.nutriplan_state to anon, authenticated;

-- ============ Tabla de autenticación por PIN ============

create table if not exists public.nutriplan_auth (
  id smallint primary key default 1,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  constraint nutriplan_auth_single_row check (id = 1)
);

alter table public.nutriplan_auth enable row level security;
-- Sin políticas en absoluto → deny-all total para anon/authenticated,
-- incluido SELECT (nadie debe poder leer ni siquiera el hash del PIN
-- directamente vía PostgREST).
revoke all on public.nutriplan_auth from anon, authenticated;

-- Fija aquí tu passphrase real (8+ caracteres, no un PIN numérico corto)
-- y ejecuta este INSERT una sola vez tras crear la tabla:
--
-- insert into public.nutriplan_auth (id, pin_hash)
-- values (1, crypt('CAMBIA-ESTA-PASSPHRASE', gen_salt('bf')))
-- on conflict (id) do update set pin_hash = excluded.pin_hash;

-- ============ RPC de escritura protegida ============

create or replace function public.rpc_save_state(p_pin text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth public.nutriplan_auth%rowtype;
  v_max_attempts constant int := 5;
  v_lockout constant interval := interval '15 minutes';
begin
  select * into v_auth from public.nutriplan_auth where id = 1;

  if v_auth.id is null then
    raise exception 'PIN no configurado. Ejecuta el INSERT en nutriplan_auth primero.';
  end if;

  if v_auth.locked_until is not null and v_auth.locked_until > now() then
    raise exception 'Demasiados intentos fallidos. Vuelve a intentarlo después de %', v_auth.locked_until;
  end if;

  -- IS DISTINCT FROM (not <>) so a NULL p_pin can't slip past a NULL
  -- comparison result and fail open — crypt(NULL, ...) is NULL, and
  -- `NULL <> x` is NULL, which plpgsql's IF treats as false.
  if p_pin is null or crypt(p_pin, v_auth.pin_hash) is distinct from v_auth.pin_hash then
    update public.nutriplan_auth
      set failed_attempts = failed_attempts + 1,
          locked_until = case
            when failed_attempts + 1 >= v_max_attempts then now() + v_lockout
            else locked_until
          end
      where id = 1;
    raise exception 'PIN incorrecto';
  end if;

  update public.nutriplan_auth
    set failed_attempts = 0, locked_until = null
    where id = 1;

  insert into public.nutriplan_state (id, data, updated_at)
  values (1, p_data, now())
  on conflict (id) do update
    set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.rpc_save_state(text, jsonb) from public;
grant execute on function public.rpc_save_state(text, jsonb) to anon, authenticated;

commit;
