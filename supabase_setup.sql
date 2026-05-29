-- ============================================================
--  NutriPlan · configuración de base de datos en Supabase
--  Pega TODO esto en el SQL Editor de Supabase y pulsa RUN.
-- ============================================================

-- 1) Tabla que guarda todo el estado de la app en una sola fila
create table if not exists public.nutriplan_state (
  id          int primary key,
  data        jsonb,
  updated_at  timestamptz default now()
);

-- 2) Fila inicial (id = 1). La app la rellenará sola al primer guardado.
insert into public.nutriplan_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 3) Seguridad a nivel de fila (RLS) + permitir lectura/escritura
--    Nota: con la clave 'anon' pública cualquiera que tenga tu URL+clave
--    podría leer/escribir esta fila. Para una app de pareja es aceptable,
--    pero si quieres privacidad real, pon el repositorio en PRIVADO
--    o añadimos login con email (Supabase Auth) más adelante.
alter table public.nutriplan_state enable row level security;

drop policy if exists "nutriplan_all" on public.nutriplan_state;
create policy "nutriplan_all"
  on public.nutriplan_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 4) Activar Realtime (sincronización instantánea entre los dos móviles)
alter publication supabase_realtime add table public.nutriplan_state;
