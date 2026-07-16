# Seguridad de Supabase — estado actual y propuesta de RLS

## Riesgo verificado (2026-07-16)

NutriPlan es una app cliente-only: no tiene backend propio, así que la
`SUPABASE_URL` y la anon key (JWT legacy) están hardcodeadas en el JS que se
sirve públicamente en `siscu30.github.io/NutriPlan/`. Eso es normal y
esperado para este tipo de arquitectura — la anon key **no es un secreto**,
está pensada para ser pública. La pregunta real es qué puede hacer alguien
que la copie del código fuente.

Se hizo una comprobación de solo lectura (sin modificar nada) contra el
proyecto real:

```
GET https://swcxredmjvrwaragmghm.supabase.co/rest/v1/nutriplan_state?select=id&limit=1
apikey: <anon key pública del código fuente>

→ HTTP 200
→ [{"id":1}]
```

**Confirmado: hoy, cualquiera que copie la anon key del código fuente puede
leer la tabla `nutriplan_state` sin ningún tipo de autenticación.** No se
probó escritura (POST/PATCH/DELETE) contra la tabla real para no arriesgar
los datos de producción, pero al no haber ninguna política RLS visible que
restrinja lectura, es estructuralmente igual de probable que la escritura
esté igual de abierta — no hay nada en el diseño actual que la bloquee.

**Qué hay expuesto:** el plan de comidas de Fran y Lua, sus registros de
agua/pasos/peso/entrenamiento y su adherencia diaria. No son datos
financieros ni médicos, pero sí personales, y la escritura abierta significa
que cualquiera con la key podría **borrar o corromper** el estado compartido
de la app — ese es el riesgo más serio, más que la lectura en sí.

## Diseño propuesto

Dado que la anon key es pública por diseño (no hay backend que la oculte),
"RLS por usuario" no aplica aquí — Fran y Lua comparten intencionadamente el
mismo blob de estado. La mitigación real es separar **lectura** (de bajo
riesgo, y necesaria para que Supabase Realtime siga funcionando) de
**escritura** (el riesgo real: pérdida de datos):

- **Lectura**: se deja abierta (`SELECT` con `USING (true)`), igual que hoy.
  Sin esto, Supabase Realtime (`postgres_changes`, que usa la sincronización
  en vivo entre los móviles de Fran y Lua) dejaría de funcionar, porque
  Realtime respeta RLS y necesita permiso de lectura para emitir eventos de
  cambio al rol `anon`.
- **Escritura**: se bloquea por completo a nivel de RLS y de privilegios de
  tabla. La única forma de escribir pasa a ser la función
  `rpc_save_state(pin, data)`, que:
  - Valida un PIN compartido (passphrase de 8+ caracteres, no un PIN
    numérico corto) contra un hash `pgcrypto` guardado en una tabla
    `nutriplan_auth` aparte, con RLS deny-all total (ni siquiera lectura
    directa del hash vía la API).
  - Aplica lockout temporal (15 min) tras 5 intentos fallidos, para que la
    key pública filtrada no permita fuerza bruta ilimitada del PIN.
  - Solo entonces hace el `upsert` real sobre `nutriplan_state`.

Ver el SQL completo y comentado en [`supabase/rls_policies.sql`](../supabase/rls_policies.sql).

## Qué NO cambia (todavía)

Este sprint es solo propuesta — **no se ha aplicado nada contra el proyecto
de producción** y **no se ha tocado `index.html` ni la lógica de sync**. En
concreto:

- No tengo credenciales de servicio del proyecto Supabase (solo la anon key
  pública que ya está en el cliente), así que no puedo aplicar este SQL yo
  mismo aunque quisiera.
- El cliente actual sigue escribiendo con `sb.from('nutriplan_state').upsert(...)`
  directamente. **Si aplicas este SQL sin más, esa escritura empezará a
  fallar** (RLS la bloqueará) hasta que el cliente se actualice para llamar
  a `sb.rpc('rpc_save_state', {p_pin: '...', p_data: DB})` en su lugar. Ese
  cambio de cliente se hará en el Sprint 2 (extracción de `js/sync.js`), y
  requiere tu confirmación explícita antes de aplicarse — es exactamente el
  tipo de cambio sensible a pérdida de datos que pediste que te preguntara
  antes de tocar.

## Cómo aplicarlo cuando quieras

1. Abre el proyecto en [supabase.com](https://supabase.com) → SQL Editor → New query.
2. Pega el contenido de `supabase/rls_policies.sql`.
3. Antes de ejecutar, sustituye `'CAMBIA-ESTA-PASSPHRASE'` en el `INSERT`
   comentado al final del bloque de `nutriplan_auth` por una passphrase real
   de 8+ caracteres, y descoméntalo.
4. Ejecuta (`Run`). Verifica con una lectura simple (`select id from
   nutriplan_state;` en el SQL Editor) que sigue funcionando.
5. **No actualices el cliente todavía** — coordina ese paso con el Sprint 2
   para no romper la sincronización en producción sin aviso.

## Fuera de alcance de este sprint

- Rotación del PIN (`rpc_rotate_pin`) — no había una vía de escritura previa
  que rotar; se puede añadir más adelante si hace falta cambiarlo sin volver
  al SQL Editor.
- Proteger otras tablas del mismo proyecto Supabase, si las hay — este
  análisis cubre únicamente `nutriplan_state`, que es la única tabla que usa
  el cliente actual.
