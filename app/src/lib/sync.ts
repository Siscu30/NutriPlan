// Sincronización con Supabase.
// - Datos: tabla plato_docs (ver supabase/plato.sql), filas protegidas por el código de casa.
// - Avisos en tiempo real: canal "broadcast" con el código de casa; al recibir uno se vuelve a leer la fila.
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { PersonId, PlanDoc } from '../data/types'
import { actions, getState, onChange, type PersonDoc, type SharedDoc } from './store'

export interface SyncConfig {
  url: string
  key: string
  household: string
}

const CFG_KEY = 'plato.sync'
const TABLE = 'plato_docs'

/** Enlace para vincular otro dispositivo (los datos van en el fragmento #, que no sale del navegador) */
export function pairingLink(c: SyncConfig): string {
  return `${location.origin}${location.pathname}#sync=${btoa(JSON.stringify(c))}`
}

function readPairingFromUrl(): SyncConfig | null {
  const m = location.hash.match(/sync=([A-Za-z0-9+/=]+)/)
  if (!m) return null
  try {
    const c = JSON.parse(atob(m[1])) as SyncConfig
    history.replaceState(null, '', location.pathname + location.search)
    if (c.url && c.key && c.household) {
      localStorage.setItem(CFG_KEY, JSON.stringify(c))
      return c
    }
  } catch {
    /* enlace incorrecto */
  }
  return null
}

export function getSyncConfig(): SyncConfig | null {
  const paired = readPairingFromUrl()
  if (paired) return paired
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const c = JSON.parse(raw) as SyncConfig
      if (c.url && c.key && c.household) return c
    }
  } catch {
    /* sin almacenamiento */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const household = readHouseholdFromUrl()
  return url && key && household ? { url, key, household } : null
}

export function setSyncConfig(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c))
    else localStorage.removeItem(CFG_KEY)
  } catch {
    /* sin almacenamiento */
  }
  restartSync()
}

/** Código nuevo de casa: 24 caracteres aleatorios */
export function newHousehold(): string {
  const a = new Uint8Array(18)
  crypto.getRandomValues(a)
  return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, '').slice(0, 24)
}

function readHouseholdFromUrl(): string | null {
  const m = location.hash.match(/casa=([A-Za-z0-9]{20,})/)
  return m ? m[1] : null
}

type Doc = { kind: 'shared'; doc: SharedDoc } | { kind: 'person'; person: PersonId; doc: PersonDoc } | { kind: 'plan'; doc: PlanDoc }

let sb: SupabaseClient | null = null
let channel: RealtimeChannel | null = null
let cfg: SyncConfig | null = null
let applying = false
let unsub: (() => void) | null = null
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const rowId = (docId: string) => `${cfg!.household}:${docId}`
const docIdOf = (c: { shared?: boolean; person?: PersonId; plan?: string }) =>
  c.shared ? 'shared' : c.person ? `person:${c.person}` : c.plan ? `plan:${c.plan}` : null

function currentDoc(docId: string): Doc | null {
  const s = getState()
  if (docId === 'shared') return { kind: 'shared', doc: s.shared }
  if (docId.startsWith('person:')) {
    const p = docId.slice(7) as PersonId
    return { kind: 'person', person: p, doc: s.people[p] }
  }
  if (docId.startsWith('plan:')) {
    const plan = s.plans[docId.slice(5)]
    return plan ? { kind: 'plan', doc: plan } : null
  }
  return null
}

function apply(docs: Doc[]) {
  applying = true
  try {
    actions.applyRemote({
      shared: docs.find((d) => d.kind === 'shared')?.doc as SharedDoc | undefined,
      people: Object.fromEntries(docs.filter((d) => d.kind === 'person').map((d) => [(d as { person: PersonId }).person, d.doc])),
      plans: docs.filter((d) => d.kind === 'plan').map((d) => d.doc as PlanDoc),
    })
  } finally {
    applying = false
  }
}

async function push(docId: string) {
  if (!sb || !cfg) return
  const d = currentDoc(docId)
  if (!d) return
  const { error } = await sb.from(TABLE).upsert({ id: rowId(docId), household: cfg.household, data: d, updated_at: new Date().toISOString() })
  if (error) {
    actions.setSync({ status: 'error', message: `No se pudo guardar en la nube: ${error.message}` })
    return
  }
  actions.setSync({ status: 'ok' })
  channel?.send({ type: 'broadcast', event: 'changed', payload: { id: docId } })
}

function schedule(docId: string) {
  clearTimeout(timers.get(docId))
  timers.set(docId, setTimeout(() => push(docId), 700))
}

async function fetchDocs(ids?: string[]): Promise<Doc[]> {
  if (!sb || !cfg) return []
  let q = sb.from(TABLE).select('id,data').eq('household', cfg.household)
  if (ids) q = q.in('id', ids.map(rowId))
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((r) => r.data as Doc)
}

async function pullAll() {
  const docs = await fetchDocs()
  apply(docs)
  // Subir lo local que falte o sea más nuevo
  const s = getState()
  const remote = new Map(docs.map((d) => [d.kind === 'shared' ? 'shared' : d.kind === 'person' ? `person:${d.person}` : `plan:${d.doc.id}`, d.doc.updatedAt]))
  const local: [string, number][] = [
    ['shared', s.shared.updatedAt],
    ['person:fran', s.people.fran.updatedAt],
    ['person:lua', s.people.lua.updatedAt],
    ...Object.values(s.plans).map((p) => [`plan:${p.id}`, p.updatedAt] as [string, number]),
  ]
  for (const [id, at] of local) if (at > 0 && at > (remote.get(id) ?? -1)) await push(id)
}

export function startSync(): () => void {
  cfg = getSyncConfig()
  if (!cfg) {
    actions.setSync({ status: 'off' })
    return () => {}
  }
  const c = cfg
  sb = createClient(c.url, c.key, { auth: { persistSession: false }, global: { headers: { 'x-household': c.household } } })
  actions.setSync({ status: 'connecting' })
  channel = sb
    .channel(`plato-${c.household}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'changed' }, async ({ payload }) => {
      try {
        apply(await fetchDocs([String(payload.id)]))
      } catch {
        /* se reintentará en la siguiente lectura completa */
      }
    })
    .subscribe()
  pullAll()
    .then(() => actions.setSync({ status: 'ok' }))
    .catch((e: { message?: string }) => actions.setSync({ status: 'error', message: `No se pudo conectar: ${e?.message ?? 'error desconocido'}` }))
  unsub = onChange((ch) => {
    if (applying) return
    const id = docIdOf(ch)
    if (id) schedule(id)
  })
  const onFocus = () => pullAll().catch(() => {})
  window.addEventListener('focus', onFocus)
  return () => {
    unsub?.()
    window.removeEventListener('focus', onFocus)
    if (channel) sb?.removeChannel(channel)
    sb = null
    channel = null
  }
}

let stop: (() => void) | null = null
export function restartSync() {
  stop?.()
  stop = startSync()
}
