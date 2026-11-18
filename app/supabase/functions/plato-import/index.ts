// Plato · importar pesajes
//
// Dos formas de llamarla:
//  1. Desde la app (sesión iniciada): POST JSON { person, image, mediaType } → devuelve { date, v } para revisar.
//  2. Desde un atajo del iPhone, con el código personal en la cabecera "x-plato-token":
//     - JSON { weight, fatPct, bmi, leanKg, date } con los datos de Salud, o
//     - el cuerpo es la imagen (captura de la báscula).
//     Guarda el pesaje del día (se une a lo que haya) y responde con un texto corto.
//
// Secretos: ANTHROPIC_API_KEY (lo añade el administrador en Supabase → Edge Functions → Secrets).
// "Verify JWT" desactivado: la autorización se hace aquí dentro.
import Anthropic from 'npm:@anthropic-ai/sdk@1.9.0'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

type Person = 'fran' | 'lua'
type Values = Record<string, number>

const KEYS = [
  'weight', 'bmi', 'fatPct', 'fatKg', 'waterPct', 'muscleKg', 'musclePct', 'skeletalKg', 'proteinPct', 'proteinKg',
  'boneKg', 'bonePct', 'visceral', 'bmr', 'bodyAge', 'leanKg', 'whr', 'hr', 'score',
] as const

const LABELS: Record<string, string> = {
  weight: 'Peso (kg)', bmi: 'IMC', fatPct: 'Porcentaje de grasa corporal (%)', fatKg: 'Grasa corporal (kg)', waterPct: 'Agua corporal (%)',
  muscleKg: 'Masa muscular (kg)', musclePct: 'Porcentaje de músculo (%)', skeletalKg: 'Masa muscular esquelética (kg)',
  proteinPct: 'Porcentaje de proteínas (%)', proteinKg: 'Masa proteica (kg)', boneKg: 'Contenido mineral óseo (kg)',
  bonePct: 'Porcentaje mineral óseo (%)', visceral: 'Calificación de grasa visceral', bmr: 'Índice metabólico basal (kcal)',
  bodyAge: 'Edad corporal (años)', leanKg: 'Peso corporal sin grasa (kg)', whr: 'Relación cintura-cadera', hr: 'Frecuencia cardiaca (lpm)',
  score: 'Puntuación corporal (puntos)',
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-plato-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const text = (body: string, status = 200) => new Response(body, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } })

/** Clave de servicio: la clásica o la nueva "sb_secret_…" (según el proyecto) */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    return keys.default ?? Object.values(keys)[0] ?? ''
  } catch {
    return ''
  }
}
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } })

/** Fecha de hoy en España (AAAA-MM-DD) */
const todayES = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** ¿El usuario está aprobado y puede ver el plan de esa persona? */
async function canView(userId: string, person: string) {
  const { data } = await admin.from('plato_profiles').select('status, can_view').eq('id', userId).maybeSingle()
  return !!data && data.status === 'approved' && (data.can_view as string[]).includes(person)
}

// ───────── lectura de la captura con Claude ─────────
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'values'],
  properties: {
    date: { type: 'string' },
    values: {
      type: 'object',
      additionalProperties: false,
      required: [...KEYS],
      properties: Object.fromEntries(KEYS.map((k) => [k, { anyOf: [{ type: 'number' }, { type: 'null' }] }])),
    },
  },
}
const SYSTEM = `Lees capturas de pantalla de apps de básculas inteligentes (Xiaomi Home, Mi Fitness, Zepp Life…) en español y devuelves sus valores.
- Copia exactamente los números que se ven; la coma es el separador decimal ("111,3" → 111.3).
- Si un dato no aparece, devuelve null. No calcules ni estimes nada.
- No confundas los cambios respecto a la medición anterior (flechas ↑ ↓ con números pequeños) con los valores.
- Campos:
${KEYS.map((k) => `- ${k}: ${LABELS[k]}`).join('\n')}
- "date": la fecha de la medición si aparece ("15/11/2026 11:31" → "2026-11-15"); cadena vacía si no aparece.`

async function readCapture(base64: string, mediaType: string): Promise<{ date: string; v: Values }> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('Falta configurar la lectura de capturas en el servidor (ANTHROPIC_API_KEY).')
  const client = new Anthropic({ apiKey: key })
  const msg = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 4000,
    system: SYSTEM,
    // deno-lint-ignore no-explicit-any
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } } as any,
    messages: [
      {
        role: 'user',
        content: [
          // deno-lint-ignore no-explicit-any
          { type: 'image', source: { type: 'base64', media_type: mediaType as any, data: base64 } },
          { type: 'text', text: 'Devuelve los valores de esta captura.' },
        ],
      },
    ],
    // deno-lint-ignore no-explicit-any
  } as any)
  if (msg.stop_reason === 'refusal') throw new Error('No se ha podido leer esta captura.')
  const out = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  const parsed = JSON.parse(out) as { date: string; values: Record<string, number | null> }
  const v: Values = {}
  for (const [k, n] of Object.entries(parsed.values)) if (typeof n === 'number' && Number.isFinite(n)) v[k] = n
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) && parsed.date <= todayES() ? parsed.date : ''
  return { date, v }
}

// ───────── guardar el pesaje del día ─────────
const emptyDoc = () => ({ overrides: {}, done: {}, recipeEdits: {}, houseBreakfast: true, weighIns: [], measures: [], updatedAt: 1 })

async function saveWeighIn(person: Person, date: string, v: Values, photo?: string) {
  const id = `auto-${date}`
  const { data: row } = await admin.from('plato_docs').select('data').eq('id', `person:${person}`).maybeSingle()
  const data = (row?.data as { kind: string; person: string; doc: Record<string, unknown> } | undefined) ?? { kind: 'person', person, doc: emptyDoc() }
  const list = ((data.doc.weighIns as { id: string; v: Values; photo?: string; deleted?: boolean }[] | undefined) ?? []).slice()
  const cur = list.find((w) => w.id === id && !w.deleted)
  const entry = { id, date, v: { ...(cur?.v ?? {}), ...v }, photo: photo ?? cur?.photo, updatedAt: Date.now() }
  if (!entry.photo) delete entry.photo
  const next = { ...data, doc: { ...data.doc, weighIns: [...list.filter((w) => w.id !== id), entry] } }
  const { error } = await admin.from('plato_docs').upsert({ id: `person:${person}`, person, data: next, updated_at: new Date().toISOString() })
  if (error) throw new Error('No se pudo guardar el pesaje.')
  return entry
}

const fmt = (n?: number, d = 1) => (n == null ? '' : n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d }))

function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Valores enviados por el atajo desde Salud: números, con coma o punto */
function healthValues(body: Record<string, unknown>): Values {
  const v: Values = {}
  for (const k of KEYS) {
    const raw = body[k]
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw.replace(',', '.').replace(/[^0-9.\-]/g, '')) : NaN
    if (Number.isFinite(n) && n > 0) v[k] = n
  }
  // Salud guarda la grasa como fracción (0,306) según el atajo
  if (v.fatPct != null && v.fatPct <= 1) v.fatPct = Math.round(v.fatPct * 1000) / 10
  for (const k of Object.keys(v)) v[k] = Math.round(v[k] * 100) / 100
  return v
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return text('Usa POST.', 405)

  try {
    const token = req.headers.get('x-plato-token')?.trim()

    // ── 2. Atajo del iPhone ──
    if (token) {
      const { data: t } = await admin.from('plato_import_tokens').select('id, user_id, person').eq('token_hash', await sha256(token)).maybeSingle()
      if (!t) return text('Código de importación no válido. Crea uno nuevo en Plato → Ajustes.', 401)
      const person = t.person as Person
      if (!(await canView(t.user_id, person))) return text('Este código ya no tiene permiso para ese plan.', 403)
      await admin.from('plato_import_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', t.id)

      const type = req.headers.get('content-type') ?? ''
      if (type.startsWith('image/')) {
        const bytes = new Uint8Array(await req.arrayBuffer())
        if (bytes.length > 3_700_000) return text('La captura es demasiado grande. Añade en el atajo "Convertir imagen" a JPEG y "Redimensionar imagen" a 1200 px.', 413)
        const mediaType = type.split(';')[0].trim() === 'image/png' ? 'image/png' : 'image/jpeg'
        const r = await readCapture(toBase64(bytes), mediaType)
        if (r.v.weight == null) return text('No encuentro el peso en esa captura. Prueba con la pantalla de resultados de la báscula.', 422)
        const date = r.date || todayES()
        const path = `body/${person}/auto-${date}.${mediaType === 'image/png' ? 'png' : 'jpg'}`
        await admin.storage.from('plato-media').upload(path, bytes, { contentType: mediaType, upsert: true })
        await saveWeighIn(person, date, r.v, `sb:${path}`)
        const extra = Object.keys(r.v).length - 1
        return text(`Guardado en Plato: ${fmt(r.v.weight)} kg${r.v.fatPct != null ? ` · ${fmt(r.v.fatPct)} % grasa` : ''} (${date})${extra > 1 ? ` y ${extra} datos más` : ''}.`)
      }

      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
      const v = healthValues(body)
      if (v.weight == null) return text('No ha llegado el peso. Revisa que el atajo envíe "weight".', 422)
      if (v.weight > 350) return text('El peso parece estar en libras. Cambia la unidad de Salud a kg.', 422)
      const d = String(body.date ?? '').slice(0, 10)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= todayES() ? d : todayES()
      await saveWeighIn(person, date, v)
      return text(`Guardado en Plato: ${fmt(v.weight)} kg${v.fatPct != null ? ` · ${fmt(v.fatPct)} % grasa` : ''} (${date}).`)
    }

    // ── 1. Desde la app, con sesión ──
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Falta iniciar sesión.' }, 401)
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user) return json({ error: 'La sesión ha caducado. Vuelve a entrar.' }, 401)
    const { person, image, mediaType } = (await req.json()) as { person: Person; image: string; mediaType?: string }
    if (!(await canView(u.user.id, person))) return json({ error: 'No tienes permiso para ese plan.' }, 403)
    if (!image || image.length > 5_000_000) return json({ error: 'Imagen no válida o demasiado grande.' }, 413)
    return json(await readCapture(image, mediaType === 'image/png' ? 'image/png' : 'image/jpeg'))
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : 'Error inesperado.'
    return req.headers.get('x-plato-token') ? text(msg, 500) : json({ error: msg }, 500)
  }
})
