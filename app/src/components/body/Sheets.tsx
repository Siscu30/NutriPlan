import { AnimatePresence, motion } from 'motion/react'
import { Camera, ChevronDown, ScanText, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { MEASURES, SCALE, fmt, live, type MeasureEntry, type MeasureKey, type ScaleKey, type WeighIn } from '../../data/body'
import type { PersonId } from '../../data/types'
import { deleteBodyPhoto, prepareImage, uploadBodyPhoto, type Prepared } from '../../lib/bodyPhoto'
import { shortDate, today } from '../../lib/dates'
import { readScaleCapture } from '../../lib/scale'
import { actions, useStore } from '../../lib/store'
import { MediaImg, Press, spring } from '../ui'

const newId = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16)
const toNum = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const toText = (n?: number) => (n == null ? '' : String(n).replace('.', ','))

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-xl flex-col rounded-t-[32px] border border-line bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-surface-2" />
          <div className="no-scrollbar overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
            <div className="flex items-center justify-between pt-4 pb-4">
              <Drawer.Title className="display text-2xl font-semibold">{title}</Drawer.Title>
              <Press onClick={onClose} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-surface">
                <X className="size-5" />
              </Press>
            </div>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function NumField({ label, unit, value, onChange, hint, big, flash }: { label: string; unit: string; value: string; onChange: (v: string) => void; hint?: string; big?: boolean; flash?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-[13px] text-muted">{label}</span>
      <motion.span
        className={`relative flex items-baseline rounded-2xl border bg-surface px-3.5 ${big ? 'h-16' : 'h-12'} items-center border-line focus-within:border-carb`}
        animate={flash ? { backgroundColor: ['color-mix(in srgb, var(--veg) 30%, var(--surface))', 'var(--surface)'] } : {}}
        transition={{ duration: 1.2 }}
      >
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder={hint ?? '—'}
          className={`num w-full min-w-0 bg-transparent outline-none placeholder:text-muted/60 ${big ? 'display text-3xl font-semibold' : 'text-base'}`}
        />
        {unit && <span className="ml-1 shrink-0 text-sm text-muted">{unit}</span>}
      </motion.span>
    </label>
  )
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] text-muted">Fecha</span>
      <input type="date" value={value} max={today()} onChange={(e) => e.target.value && onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-line bg-surface px-3.5 text-base outline-none focus:border-carb" />
    </label>
  )
}

const Msg = ({ text, ok }: { text: string; ok?: boolean }) => (
  <p role={ok ? 'status' : 'alert'} className={`rounded-2xl px-4 py-3 text-sm ${ok ? 'bg-veg/15 text-veg' : 'bg-prot/12 text-prot'}`}>
    {text}
  </p>
)

// ───────── pesaje ─────────
export function WeighInSheet({ open, person, entry, onClose }: { open: boolean; person: PersonId; entry: WeighIn | null; onClose: () => void }) {
  const apiKey = useStore((s) => s.apiKey)
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Partial<Record<ScaleKey, string>>>({})
  const [photo, setPhoto] = useState<string | undefined>()
  const [prep, setPrep] = useState<Prepared | null>(null)
  const [reading, setReading] = useState(false)
  const [filled, setFilled] = useState<Set<ScaleKey>>(new Set())
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setDate(entry?.date ?? today())
    setVals(Object.fromEntries(Object.entries(entry?.v ?? {}).map(([k, n]) => [k, toText(n)])))
    setPhoto(entry?.photo)
    setPrep(null)
    setFilled(new Set())
    setMore(!!entry && Object.keys(entry.v).length > 1)
    setMsg(null)
    setConfirmDel(false)
    return () => abort.current?.abort()
  }, [open, entry])

  const pickFile = async (file?: File) => {
    if (!file) return
    setMsg(null)
    let p: Prepared
    try {
      p = await prepareImage(file)
    } catch {
      return setMsg({ text: 'No se pudo abrir esa imagen. Prueba con otra captura.' })
    }
    setPrep(p)
    if (!apiKey) return setMsg({ text: 'Rellena los datos a mano. Si añades tu clave de Claude en Ajustes, la app los leerá sola de la captura.', ok: true })
    setReading(true)
    abort.current = new AbortController()
    try {
      const r = await readScaleCapture(apiKey, p.base64, abort.current.signal)
      setVals((cur) => ({ ...cur, ...Object.fromEntries(Object.entries(r.v).map(([k, n]) => [k, toText(n)])) }))
      setFilled(new Set(Object.keys(r.v) as ScaleKey[]))
      if (r.date) setDate(r.date > today() ? today() : r.date)
      setMore(true)
      setMsg({ text: `He leído ${Object.keys(r.v).length} datos de la captura. Revísalos antes de guardar.`, ok: true })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg({ text: (e as Error).message || 'No se pudo leer la captura. Rellena los datos a mano.' })
    } finally {
      setReading(false)
    }
  }

  const weight = toNum(vals.weight ?? '')
  const save = async () => {
    if (!weight) return setMsg({ text: 'Escribe al menos el peso.' })
    setBusy(true)
    const id = entry?.id ?? newId()
    let ref = photo
    try {
      if (prep) ref = await uploadBodyPhoto(person, id, prep.blob)
    } catch (e) {
      setBusy(false)
      return setMsg({ text: (e as Error).message })
    }
    const v: WeighIn['v'] = {}
    for (const m of SCALE) {
      const n = toNum(vals[m.key] ?? '')
      if (n != null) v[m.key] = n
    }
    actions.saveWeighIn(person, { id, date, photo: ref, v, updatedAt: 0 })
    setBusy(false)
    onClose()
  }

  const remove = async () => {
    if (!entry) return
    if (!confirmDel) return setConfirmDel(true)
    actions.deleteWeighIn(person, entry.id)
    void deleteBodyPhoto(entry.photo)
    onClose()
  }

  const preview = prep?.url ?? photo
  const rest = SCALE.filter((m) => m.key !== 'weight')

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Editar pesaje' : 'Nuevo pesaje'}>
      <div className="space-y-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)} />
        <Press onClick={() => fileRef.current?.click()} className="relative block w-full overflow-hidden rounded-3xl border border-dashed border-line bg-surface text-left">
          {preview ? (
            <div className="relative h-44">
              {prep ? <img src={prep.url} alt="Captura de la báscula" className="size-full object-cover object-top" /> : <MediaImg src={preview} alt="Captura de la báscula" className="size-full object-cover object-top" />}
              <AnimatePresence>
                {reading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                    <motion.span className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-white/35 to-transparent" animate={{ y: [-60, 180] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} />
                    <span className="relative flex items-center gap-2 text-sm font-semibold">
                      <ScanText className="size-4" /> Leyendo la captura…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">Cambiar foto</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent">
                <Camera className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">Añadir la captura de la báscula</span>
                <span className="block text-sm text-muted">{apiKey ? 'Claude leerá los datos por ti' : 'Opcional; los datos los escribes abajo'}</span>
              </span>
            </div>
          )}
        </Press>

        {msg && <Msg {...msg} />}

        <div className="grid grid-cols-[1.3fr_1fr] gap-3">
          <NumField label="Peso" unit="kg" big value={vals.weight ?? ''} onChange={(v) => setVals({ ...vals, weight: v })} flash={filled.has('weight')} />
          <DateField value={date} onChange={setDate} />
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} className="flex w-full cursor-pointer items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm font-semibold">
          Resto de datos de la báscula
          <motion.span animate={{ rotate: more ? 180 : 0 }} transition={spring}>
            <ChevronDown className="size-4" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {more && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-3 pb-1">
                {rest.map((m) => (
                  <NumField key={m.key} label={m.label} unit={m.unit} value={vals[m.key] ?? ''} onChange={(v) => setVals({ ...vals, [m.key]: v })} flash={filled.has(m.key)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Press disabled={busy || reading || !weight} onClick={save} className="h-14 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar pesaje'}
        </Press>
        {entry && (
          <Press onClick={remove} className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold ${confirmDel ? 'bg-prot text-white' : 'bg-surface text-prot'}`}>
            <Trash2 className="size-4" /> {confirmDel ? 'Pulsa otra vez para borrarlo' : 'Borrar pesaje'}
          </Press>
        )}
      </div>
    </Sheet>
  )
}

// ───────── medidas ─────────
export function MeasureSheet({ open, person, entry, onClose }: { open: boolean; person: PersonId; entry: MeasureEntry | null; onClose: () => void }) {
  const all = useStore((s) => s.people[person].measures)
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Partial<Record<MeasureKey, string>>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(entry?.date ?? today())
    setVals(Object.fromEntries(Object.entries(entry?.v ?? {}).map(([k, n]) => [k, toText(n)])))
    setMsg(null)
    setConfirmDel(false)
  }, [open, entry])

  const previous = live(all).filter((m) => m.id !== entry?.id && m.date <= date)
  const prevOf = (k: MeasureKey) => [...previous].reverse().find((m) => m.v[k] != null)
  const save = () => {
    const v: MeasureEntry['v'] = {}
    for (const m of MEASURES) {
      const n = toNum(vals[m.key] ?? '')
      if (n != null) v[m.key] = n
    }
    if (!Object.keys(v).length) return setMsg('Escribe al menos una medida.')
    actions.saveMeasure(person, { id: entry?.id ?? newId(), date, v, updatedAt: 0 })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Editar medidas' : 'Nuevas medidas'}>
      <div className="space-y-4">
        <DateField value={date} onChange={setDate} />
        <ul className="space-y-2.5">
          {MEASURES.map((m, i) => {
            const prev = prevOf(m.key)
            return (
              <motion.li key={m.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }} className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-2xl bg-surface p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-[13px] leading-snug text-muted">{m.how[0]}</p>
                  {prev && (
                    <p className="num mt-0.5 text-xs text-muted">
                      Anterior: {fmt(prev.v[m.key], 1)} cm · {shortDate(prev.date)}
                    </p>
                  )}
                </div>
                <NumField label="" unit="cm" value={vals[m.key] ?? ''} hint={prev ? fmt(prev.v[m.key], 1) : '—'} onChange={(v) => setVals({ ...vals, [m.key]: v })} />
              </motion.li>
            )
          })}
        </ul>
        {msg && <Msg text={msg} />}
        <Press onClick={save} className="h-14 w-full rounded-2xl bg-accent font-semibold text-on-accent">
          Guardar medidas
        </Press>
        {entry && (
          <Press
            onClick={() => {
              if (!confirmDel) return setConfirmDel(true)
              actions.deleteMeasure(person, entry.id)
              onClose()
            }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold ${confirmDel ? 'bg-prot text-white' : 'bg-surface text-prot'}`}
          >
            <Trash2 className="size-4" /> {confirmDel ? 'Pulsa otra vez para borrarlas' : 'Borrar estas medidas'}
          </Press>
        )}
      </div>
    </Sheet>
  )
}
