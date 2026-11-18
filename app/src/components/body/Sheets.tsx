import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Images, Plus, ScanText, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { MEASURES, SCALE, fmt, live, photosOf, type MeasureEntry, type MeasureKey, type ScaleKey, type WeighIn } from '../../data/body'
import type { PersonId } from '../../data/types'
import { deleteBodyPhoto, prepareImage, uploadBodyPhoto, type Prepared } from '../../lib/bodyPhoto'
import { shortDate, today } from '../../lib/dates'
import { readScaleScreens, type OcrProgress } from '../../lib/scaleOcr'
import { actions, useStore } from '../../lib/store'
import { usePageViewer } from '../PageViewer'
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
type Shot = { key: string; ref?: string; prep?: Prepared }

export function WeighInSheet({ open, person, entry, onClose }: { open: boolean; person: PersonId; entry: WeighIn | null; onClose: () => void }) {
  const viewer = usePageViewer()
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Partial<Record<ScaleKey, string>>>({})
  const [shots, setShots] = useState<Shot[]>([])
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [filled, setFilled] = useState<Set<ScaleKey>>(new Set())
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const alive = useRef(true)

  useEffect(() => {
    if (!open) return
    alive.current = true
    setDate(entry?.date ?? today())
    setVals(Object.fromEntries(Object.entries(entry?.v ?? {}).map(([k, n]) => [k, toText(n)])))
    setShots(photosOf(entry).map((ref) => ({ key: ref, ref })))
    setFilled(new Set())
    setMore(!!entry && Object.keys(entry.v).length > 1)
    setMsg(null)
    setProgress(null)
    setConfirmDel(false)
    return () => {
      alive.current = false
    }
  }, [open, entry])

  const pickFiles = async (files: File[]) => {
    if (!files.length) return
    setMsg(null)
    const preps: Prepared[] = []
    const originals: File[] = []
    for (const f of files) {
      try {
        preps.push(await prepareImage(f))
        originals.push(f)
      } catch {
        /* imagen ilegible: se ignora */
      }
    }
    if (!preps.length) return setMsg({ text: 'No se pudo abrir esa imagen. Prueba con otra captura.' })
    setShots((s) => [...s, ...preps.map((p) => ({ key: p.url, prep: p }))])
    try {
      // El lector usa la captura original (a resolución completa); la versión reducida es solo para guardarla
      const r = await readScaleScreens(
        originals,
        (p) => alive.current && setProgress(p),
      )
      if (!alive.current) return
      const got = Object.keys(r.v) as ScaleKey[]
      // Solo rellena lo que está vacío: lo escrito a mano no se pisa
      setVals((cur) => {
        const next = { ...cur }
        for (const k of got) if (!next[k]) next[k] = toText(r.v[k])
        return next
      })
      setFilled(new Set(got))
      if (!entry && r.date) setDate(r.date)
      setMore(got.length > 1)
      setMsg(
        got.length
          ? {
              text: `He leído ${got.length} ${got.length === 1 ? 'dato' : 'datos'} (en verde). ${r.check.includes('weight') ? 'Comprueba el peso: no he podido leer el decimal. ' : ''}Revísalos con la captura antes de guardar.`,
              ok: !r.check.length,
            }
          : { text: 'No he encontrado datos en esa imagen. Usa las capturas de la pantalla de resultados de la báscula, o escribe los datos a mano.' },
      )
    } catch {
      if (alive.current) setMsg({ text: 'No se pudo preparar el lector de capturas (¿sin conexión la primera vez?). Escribe los datos a mano y guarda igualmente.' })
    } finally {
      if (alive.current) setProgress(null)
    }
  }

  const weight = toNum(vals.weight ?? '')
  const save = async () => {
    if (!weight) return setMsg({ text: 'Escribe al menos el peso.' })
    setBusy(true)
    const id = entry?.id ?? newId()
    const refs: string[] = []
    try {
      for (const [i, s] of shots.entries()) {
        if (s.ref) refs.push(s.ref)
        else if (s.prep) refs.push(await uploadBodyPhoto(person, `${id}-${Date.now().toString(36)}${i}`, s.prep.blob))
      }
    } catch (e) {
      setBusy(false)
      return setMsg({ text: (e as Error).message })
    }
    // Fotos quitadas al editar: se borran del almacenamiento
    for (const old of photosOf(entry)) if (!refs.includes(old)) void deleteBodyPhoto(old)
    const v: WeighIn['v'] = {}
    for (const m of SCALE) {
      const n = toNum(vals[m.key] ?? '')
      if (n != null) v[m.key] = n
    }
    actions.saveWeighIn(person, { id, date, photo: refs[0], photos: refs.length ? refs : undefined, v, updatedAt: 0 })
    setBusy(false)
    onClose()
  }

  const remove = async () => {
    if (!entry) return
    if (!confirmDel) return setConfirmDel(true)
    actions.deleteWeighIn(person, entry.id)
    for (const ref of photosOf(entry)) void deleteBodyPhoto(ref)
    onClose()
  }

  const reading = !!progress
  const rest = SCALE.filter((m) => m.key !== 'weight')
  const srcs = shots.map((s) => s.prep?.url ?? s.ref!)

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Editar pesaje' : 'Nuevo pesaje'}>
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            void pickFiles(files)
          }}
        />

        {shots.length === 0 ? (
          <Press onClick={() => fileRef.current?.click()} className="block w-full rounded-3xl border border-dashed border-line bg-surface p-5 text-left">
            <span className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent">
                <Images className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">Elegir las capturas de la báscula</span>
                <span className="block text-sm text-muted">Puedes elegir varias a la vez; Plato lee los datos en tu móvil</span>
              </span>
            </span>
          </Press>
        ) : (
          <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {shots.map((s, i) => (
              <motion.div key={s.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="relative h-40 w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface">
                <button type="button" onClick={() => viewer(srcs, i, 'Captura de la báscula')} aria-label={`Ver captura ${i + 1}`} className="size-full cursor-zoom-in">
                  {s.prep ? <img src={s.prep.url} alt="" className="size-full object-cover object-top" /> : <MediaImg src={s.ref} className="size-full object-cover object-top" />}
                </button>
                {!reading && (
                  <button type="button" onClick={() => setShots((all) => all.filter((x) => x.key !== s.key))} aria-label={`Quitar captura ${i + 1}`} className="absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white">
                    <X className="size-3.5" />
                  </button>
                )}
                <AnimatePresence>
                  {reading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-hidden bg-black/35">
                      <motion.span className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-white/45 to-transparent" animate={{ y: [-40, 170] }} transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut', delay: i * 0.2 }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {!reading && (
              <Press onClick={() => fileRef.current?.click()} aria-label="Añadir otra captura" className="grid h-40 w-24 shrink-0 place-items-center rounded-2xl border border-dashed border-line bg-surface text-muted">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <Plus className="size-5" /> Otra
                </span>
              </Press>
            )}
          </div>
        )}

        <AnimatePresence>
          {progress && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-2xl bg-surface px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ScanText className="size-4" />
                  {progress.stage === 'loading' ? 'Preparando el lector (solo la primera vez)…' : `Leyendo captura ${progress.index} de ${progress.total}…`}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div className="h-full rounded-full bg-veg" animate={{ width: `${Math.max(6, progress.pct * 100)}%` }} transition={spring} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
