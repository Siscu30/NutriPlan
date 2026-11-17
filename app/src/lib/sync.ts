// Sincronización con Supabase usando la sesión del usuario.
// Las reglas RLS (supabase/plato.sql) deciden qué filas puede leer y escribir cada uno.
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PersonId, PlanDoc } from '../data/types'
import { actions, getState, onChange, type PersonDoc, type SharedDoc } from './store'
import { supabase } from './supabase'

const TABLE = 'plato_docs'

type Doc = { kind: 'shared'; doc: SharedDoc } | { kind: 'person'; person: PersonId; doc: PersonDoc } | { kind: 'plan'; doc: PlanDoc }

let channel: RealtimeChannel | null = null
let applying = false
let canView: PersonId[] = []
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const docIdOf = (c: { shared?: boolean; person?: PersonId; plan?: string }) =>
  c.shared ? 'shared' : c.person ? `person:${c.person}` : c.plan ? `plan:${c.plan}` : null

function currentDoc(docId: string): { doc: Doc; person: PersonId | null } | null {
  const s = getState()
  if (docId === 'shared') return { doc: { kind: 'shared', doc: s.shared }, person: null }
  if (docId.startsWith('person:')) {
    const p = docId.slice(7) as PersonId
    return { doc: { kind: 'person', person: p, doc: s.people[p] }, person: p }
  }
  const plan = s.plans[docId.slice(5)]
  return plan ? { doc: { kind: 'plan', doc: plan }, person: plan.person } : null
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
  if (!supabase) return
  const cur = currentDoc(docId)
  if (!cur) return
  if (cur.person && !canView.includes(cur.person)) return
  const { error } = await supabase.from(TABLE).upsert({ id: docId, person: cur.person, data: cur.doc, updated_at: new Date().toISOString() })
  actions.setSync(error ? { status: 'error', message: `No se pudo guardar en la nube: ${error.message}` } : { status: 'ok' })
}

function schedule(docId: string) {
  clearTimeout(timers.get(docId))
  timers.set(docId, setTimeout(() => push(docId), 700))
}

async function fetchDocs(ids?: string[]): Promise<Doc[]> {
  if (!supabase) return []
  let q = supabase.from(TABLE).select('id,data')
  if (ids) q = q.in('id', ids)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((r) => r.data as Doc)
}

async function pullAll() {
  const docs = await fetchDocs()
  apply(docs)
  const s = getState()
  const remote = new Map(docs.map((d) => [d.kind === 'shared' ? 'shared' : d.kind === 'person' ? `person:${d.person}` : `plan:${d.doc.id}`, d.doc.updatedAt]))
  const local: [string, number][] = [
    ['shared', s.shared.updatedAt],
    ...canView.map((p) => [`person:${p}`, s.people[p].updatedAt] as [string, number]),
    ...Object.values(s.plans)
      .filter((p) => canView.includes(p.person))
      .map((p) => [`plan:${p.id}`, p.updatedAt] as [string, number]),
  ]
  for (const [id, at] of local) if (at > 0 && at > (remote.get(id) ?? -1)) await push(id)
}

let stopFn: (() => void) | null = null

/** Arranca la sincronización para un usuario aprobado */
export function startSync(view: PersonId[]) {
  stopSync()
  if (!supabase) return
  const sb = supabase
  canView = view
  actions.setSync({ status: 'connecting' })
  channel = sb
    .channel('plato-docs')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async (payload) => {
      const id = (payload.new as { id?: string })?.id
      if (!id) return
      try {
        const docs = await fetchDocs([id])
        apply(docs)
        // Si al unir pesajes y medidas quedó algo que la nube no tiene, se sube
        for (const d of docs) if (d.kind === 'person' && getState().people[d.person].updatedAt > d.doc.updatedAt) schedule(`person:${d.person}`)
      } catch {
        /* se recupera en la siguiente lectura completa */
      }
    })
    .subscribe()
  pullAll()
    .then(() => actions.setSync({ status: 'ok' }))
    .catch((e: { message?: string }) => actions.setSync({ status: 'error', message: `No se pudo conectar: ${e?.message ?? 'error desconocido'}` }))
  const unsub = onChange((ch) => {
    if (applying) return
    const id = docIdOf(ch)
    if (id) schedule(id)
  })
  const onFocus = () => pullAll().catch(() => {})
  window.addEventListener('focus', onFocus)
  stopFn = () => {
    unsub()
    window.removeEventListener('focus', onFocus)
    if (channel) sb.removeChannel(channel)
    channel = null
  }
}

export function stopSync() {
  stopFn?.()
  stopFn = null
  actions.setSync({ status: 'off' })
}
