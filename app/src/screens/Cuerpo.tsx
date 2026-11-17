import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Image as ImageIcon, Lightbulb, Plus, Ruler, Scale } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MEASURES, MEASURE_TIPS, SCALE, fmt, fmtDelta, live, round, tone, type MeasureEntry, type MeasureKey, type MetricMeta, type WeighIn } from '../data/body'
import type { PersonId } from '../data/types'
import { BodyFigure, type ToneName } from '../components/body/BodyFigure'
import { LineChart, daysBetween, type Point } from '../components/body/LineChart'
import { MeasureSheet, WeighInSheet } from '../components/body/Sheets'
import { PersonSwitch } from '../components/Nav'
import { AnimatedNumber, Press, spring } from '../components/ui'
import { longDate, shortDate, today } from '../lib/dates'
import { useStore } from '../lib/store'

type View = 'pesos' | 'medidas' | 'evolucion'
const VIEWS: { id: View; label: string }[] = [
  { id: 'pesos', label: 'Pesos' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'evolucion', label: 'Evolución' },
]
const TONE_COLOR: Record<ToneName, string> = { good: 'var(--veg)', bad: 'var(--carb)', flat: 'var(--muted)' }
const SCALE_META = Object.fromEntries(SCALE.map((m) => [m.key, m]))

/** Serie (fecha, valor) de una métrica, en orden */
function series<K extends string>(list: { date: string; v: Partial<Record<K, number>> }[], k: K): Point[] {
  return list.filter((e) => e.v[k] != null).map((e) => ({ date: e.date, v: e.v[k] as number }))
}

export function Cuerpo() {
  const person = useStore((s) => s.person)
  const name = useStore((s) => s.shared.names[s.person])
  const doc = useStore((s) => s.people[s.person])
  const [view, setView] = useState<View>('pesos')
  const [dir, setDir] = useState(1)
  const [weighSheet, setWeighSheet] = useState<{ entry: WeighIn | null } | null>(null)
  const [measureSheet, setMeasureSheet] = useState<{ entry: MeasureEntry | null } | null>(null)

  const weighIns = useMemo(() => live(doc.weighIns ?? []), [doc.weighIns])
  const measures = useMemo(() => live(doc.measures ?? []), [doc.measures])

  const go = (v: View) => {
    setDir(VIEWS.findIndex((x) => x.id === v) >= VIEWS.findIndex((x) => x.id === view) ? 1 : -1)
    setView(v)
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">Seguimiento de {name}</p>
          <h1 className="display truncate text-[30px] leading-tight font-semibold md:text-4xl">Cuerpo</h1>
        </div>
        <PersonSwitch />
      </header>

      <div role="tablist" aria-label="Apartados" className="mt-5 flex rounded-full border border-line bg-surface p-1">
        {VIEWS.map((v) => (
          <Press key={v.id} role="tab" aria-selected={view === v.id} onClick={() => go(v.id)} className={`relative h-10 flex-1 rounded-full text-sm font-semibold ${view === v.id ? 'text-on-accent' : 'text-muted'}`}>
            {view === v.id && <motion.span layoutId="body-tab" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative">{v.label}</span>
          </Press>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={view + person}
          initial={{ opacity: 0, x: 24 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * dir, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          className="mt-6"
        >
          {view === 'pesos' && <Pesos list={weighIns} onAdd={() => setWeighSheet({ entry: null })} onOpen={(entry) => setWeighSheet({ entry })} />}
          {view === 'medidas' && <Medidas person={person} list={measures} onAdd={() => setMeasureSheet({ entry: null })} onOpen={(entry) => setMeasureSheet({ entry })} />}
          {view === 'evolucion' && <Evolucion person={person} weighIns={weighIns} measures={measures} onAdd={() => go('pesos')} />}
        </motion.div>
      </AnimatePresence>

      <WeighInSheet open={!!weighSheet} person={person} entry={weighSheet?.entry ?? null} onClose={() => setWeighSheet(null)} />
      <MeasureSheet open={!!measureSheet} person={person} entry={measureSheet?.entry ?? null} onClose={() => setMeasureSheet(null)} />
    </div>
  )
}

// ───────── piezas comunes ─────────
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-line bg-surface p-5 ${className}`}>{children}</section>
}

function Delta({ d, meta, suffix }: { d: number; meta: Pick<MetricMeta<string>, 'good' | 'decimals' | 'unit'>; suffix?: string }) {
  const t = tone(d, meta.good, meta.decimals)
  const r = round(d, meta.decimals)
  return (
    <span className="num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap" style={{ color: TONE_COLOR[t], background: `color-mix(in srgb, ${TONE_COLOR[t]} 14%, transparent)` }}>
      {r > 0 ? '↑' : r < 0 ? '↓' : '='} {fmtDelta(d, meta.decimals)}
      {meta.unit && meta.unit !== '%' ? ` ${meta.unit}` : meta.unit}
      {suffix && <span className="font-normal opacity-80"> {suffix}</span>}
    </span>
  )
}

function AddButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <Press onClick={onClick} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-on-accent shadow-soft">
      {icon} {children}
    </Press>
  )
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-ink">{icon}</span>
      <h2 className="display text-xl font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      <div className="mt-2 w-full max-w-xs">{action}</div>
    </Card>
  )
}

// ───────── Pesos ─────────
function Pesos({ list, onAdd, onOpen }: { list: WeighIn[]; onAdd: () => void; onOpen: (w: WeighIn) => void }) {
  const add = <AddButton onClick={onAdd} icon={<Plus className="size-5" />}>Añadir pesaje</AddButton>
  if (!list.length)
    return <Empty icon={<Scale className="size-6" />} title="Aún no hay pesajes" text="Añade la captura de tu báscula o escribe el peso. Con cada semana verás cómo cambia tu cuerpo." action={add} />

  const last = list[list.length - 1]
  const prev = [...list].reverse().find((w) => w.id !== last.id && w.v.weight != null)
  const first = list.find((w) => w.v.weight != null)
  const weight = series(list, 'weight')
  // Último valor conocido de cada dato y el anterior a ese (no todos los pesajes traen todo)
  const stats = (['fatPct', 'muscleKg', 'waterPct', 'visceral', 'bmr', 'bmi'] as const)
    .map((k) => {
      const s = series(list, k)
      return { m: SCALE_META[k], now: s[s.length - 1]?.v, before: s[s.length - 2]?.v }
    })
    .filter((x) => x.now != null)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
      <div className="space-y-5">
        <Card>
          <p className="text-sm text-muted">Último pesaje · {longDate(last.date)}</p>
          <div className="mt-1 flex items-end gap-2">
            <AnimatedNumber value={last.v.weight ?? 0} decimals={1} className="display text-6xl leading-none font-semibold" />
            <span className="mb-1.5 text-lg text-muted">kg</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {prev?.v.weight != null && last.v.weight != null && <Delta d={last.v.weight - prev.v.weight} meta={SCALE_META.weight} suffix={`desde el ${shortDate(prev.date)}`} />}
            {first && first.id !== prev?.id && first.id !== last.id && last.v.weight != null && first.v.weight != null && (
              <Delta d={last.v.weight - first.v.weight} meta={SCALE_META.weight} suffix="en total" />
            )}
          </div>
          {weight.length > 1 && (
            <div className="mt-4 -mx-1">
              <LineChart data={weight} unit="kg" decimals={1} height={150} />
            </div>
          )}
        </Card>
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {stats.map(({ m, now, before }, i) => (
              <motion.div key={m.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 * i }} className="rounded-3xl border border-line bg-surface p-4">
                <p className="truncate text-[13px] text-muted">{m.label}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <AnimatedNumber value={now ?? 0} decimals={m.decimals} className="display text-2xl font-semibold" />
                  <span className="text-sm text-muted">{m.unit}</span>
                </p>
                {before != null && now != null && <div className="mt-1.5">{<Delta d={now - before} meta={m} />}</div>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {add}
        <Card className="p-2">
          <h2 className="px-3 pt-2 pb-1 text-sm font-semibold text-muted">Historial</h2>
          <ul>
            {[...list].reverse().map((w, i, arr) => {
              const older = arr.slice(i + 1).find((x) => x.v.weight != null)
              return (
                <li key={w.id}>
                  <Press whileHover={{ x: 2 }} onClick={() => onOpen(w)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-surface-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">{w.photo ? <ImageIcon className="size-4" /> : <Scale className="size-4" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="num block font-semibold">{fmt(w.v.weight, 1)} kg</span>
                      <span className="block text-[13px] text-muted">
                        {shortDate(w.date)}
                        {w.v.fatPct != null && ` · ${fmt(w.v.fatPct, 1)} % grasa`}
                      </span>
                    </span>
                    {older?.v.weight != null && w.v.weight != null && <Delta d={w.v.weight - older.v.weight} meta={SCALE_META.weight} />}
                    <ChevronRight className="size-4 text-muted" />
                  </Press>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/** Último valor conocido de cada medida */
function latestValues(list: MeasureEntry[]) {
  const out: Partial<Record<MeasureKey, number>> = {}
  for (const e of list) for (const m of MEASURES) if (e.v[m.key] != null) out[m.key] = e.v[m.key]
  return out
}

// ───────── Medidas ─────────
function Medidas({ person, list, onAdd, onOpen }: { person: PersonId; list: MeasureEntry[]; onAdd: () => void; onOpen: (m: MeasureEntry) => void }) {
  const [sel, setSel] = useState<MeasureKey | null>(null)
  const values = latestValues(list)
  const meta = MEASURES.find((m) => m.key === sel)
  const howRef = useRef<HTMLDivElement>(null)
  // En el móvil la explicación queda debajo de la figura: se acerca sola
  useEffect(() => {
    if (sel && window.innerWidth < 768) setTimeout(() => howRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
  }, [sel])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8">
      <Card className="relative overflow-hidden px-2 pt-3 pb-1">
        <p className="px-3 text-sm text-muted">{sel ? 'Toca otra zona o la misma para cerrar' : 'Toca una zona para ver cómo medirla'}</p>
        <BodyFigure person={person} values={values} selected={sel} onSelect={(k) => setSel((s) => (s === k ? null : k))} />
      </Card>

      <div ref={howRef} className="scroll-mb-28 space-y-4">
        <AnimatePresence mode="wait">
          {meta ? (
            <motion.div key={meta.key} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={spring}>
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-carb/15 text-carb">
                    <Ruler className="size-5" />
                  </span>
                  <div>
                    <h2 className="display text-xl font-semibold">{meta.label}</h2>
                    <p className="num text-sm text-muted">{values[meta.key] != null ? `Última: ${fmt(values[meta.key], 1)} cm` : 'Aún sin medir'}</p>
                  </div>
                </div>
                <ol className="mt-4 space-y-2.5">
                  {meta.how.map((h, i) => (
                    <motion.li key={h} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.06 * (i + 1) }} className="flex gap-3">
                      <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{i + 1}</span>
                      <span className="text-[15px] leading-snug">{h}</span>
                    </motion.li>
                  ))}
                </ol>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="tips" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring}>
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-veg/15 text-veg">
                    <Lightbulb className="size-5" />
                  </span>
                  <h2 className="display text-xl font-semibold">Para que las medidas cuadren</h2>
                </div>
                <ul className="mt-4 space-y-2 text-[15px] leading-snug">
                  {MEASURE_TIPS.map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-veg" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AddButton onClick={onAdd} icon={<Ruler className="size-5" />}>
          Añadir medidas
        </AddButton>

        {list.length > 0 && (
          <Card className="p-2">
            <h2 className="px-3 pt-2 pb-1 text-sm font-semibold text-muted">Historial</h2>
            <ul>
              {[...list].reverse().map((e) => (
                <li key={e.id}>
                  <Press whileHover={{ x: 2 }} onClick={() => onOpen(e)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{longDate(e.date)}</span>
                      <span className="num block truncate text-[13px] text-muted">
                        {MEASURES.filter((m) => e.v[m.key] != null)
                          .map((m) => `${m.short} ${fmt(e.v[m.key], 1)}`)
                          .join(' · ')}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Press>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

// ───────── Evolución ─────────
type Since = 'inicio' | 'anterior'
type Range = 30 | 90 | 0
const RANGES: { id: Range; label: string }[] = [
  { id: 30, label: '1 mes' },
  { id: 90, label: '3 meses' },
  { id: 0, label: 'Todo' },
]

interface ChartMetric {
  id: string
  label: string
  unit: string
  decimals: number
  good: MetricMeta<string>['good']
  data: Point[]
}

function Evolucion({ person, weighIns, measures, onAdd }: { person: PersonId; weighIns: WeighIn[]; measures: MeasureEntry[]; onAdd: () => void }) {
  const [since, setSince] = useState<Since>('inicio')
  const [range, setRange] = useState<Range>(0)
  const [metricId, setMetricId] = useState('weight')
  const [sel, setSel] = useState<MeasureKey | null>(null)

  const metrics: ChartMetric[] = useMemo(
    () =>
      [
        ...(['weight', 'fatPct', 'muscleKg', 'waterPct', 'visceral', 'skeletalKg', 'bmi', 'bmr'] as const).map((k) => ({ id: k, ...SCALE_META[k], data: series(weighIns, k) })),
        ...MEASURES.map((m) => ({ id: m.key, label: m.label, unit: m.unit, decimals: m.decimals, good: m.good, data: series(measures, m.key) })),
      ].filter((m) => m.data.length > 0),
    [weighIns, measures],
  )

  if (!weighIns.length && !measures.length)
    return (
      <Empty
        icon={<Scale className="size-6" />}
        title="Aquí verás tu evolución"
        text="En cuanto añadas un par de pesajes o medidas, la figura se teñirá según cómo cambia cada zona."
        action={<AddButton onClick={onAdd} icon={<Plus className="size-5" />}>Añadir el primer pesaje</AddButton>}
      />
    )

  // Cambio por medida sobre la figura
  const deltas: Partial<Record<MeasureKey, { d: number; tone: ToneName }>> = {}
  for (const m of MEASURES) {
    const s = series(measures, m.key)
    if (s.length < 2) continue
    const base = since === 'inicio' ? s[0] : s[s.length - 2]
    const d = s[s.length - 1].v - base.v
    deltas[m.key] = { d, tone: tone(d, m.good) }
  }
  const values = latestValues(measures)

  const w = series(weighIns, 'weight')
  const lastW = w[w.length - 1]
  const prevW = w[w.length - 2]
  const firstW = w[0]

  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0]
  const cut = metric && range ? metric.data.filter((p) => daysBetween(p.date, today()) <= range) : metric?.data ?? []
  const shown = cut.length ? cut : metric?.data.slice(-1) ?? []
  const change = shown.length > 1 ? shown[shown.length - 1].v - shown[0].v : 0

  return (
    <div className="space-y-5">
      {lastW && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Peso actual" value={lastW.v} decimals={1} unit="kg" />
          <Stat label="Cambio total" value={firstW && lastW !== firstW ? lastW.v - firstW.v : 0} decimals={1} unit="kg" signed good="down" />
          <Stat label="Esta semana" value={prevW ? lastW.v - prevW.v : 0} decimals={1} unit="kg" signed good="down" />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <Card className="overflow-hidden px-2 pt-3 pb-1">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3">
            <p className="text-sm whitespace-nowrap text-muted">Cambio por zona</p>
            <div role="radiogroup" aria-label="Comparar" className="flex rounded-full bg-surface-2 p-0.5">
              {(['inicio', 'anterior'] as Since[]).map((s) => (
                <Press key={s} role="radio" aria-checked={since === s} onClick={() => setSince(s)} className={`relative h-8 rounded-full px-3 text-xs font-semibold whitespace-nowrap ${since === s ? 'text-on-accent' : 'text-muted'}`}>
                  {since === s && <motion.span layoutId="since-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
                  <span className="relative">{s === 'inicio' ? 'Desde el inicio' : 'Última vez'}</span>
                </Press>
              ))}
            </div>
          </div>
          {Object.keys(deltas).length === 0 ? (
            <p className="px-3 pt-2 text-sm text-muted">Necesitas dos tomas de medidas para ver el cambio. Mientras, la figura muestra las últimas.</p>
          ) : (
            <div className="flex gap-3 px-3 pt-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-veg" /> Va bien
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-carb" /> A vigilar
              </span>
            </div>
          )}
          <BodyFigure
            key={since}
            replay={since}
            person={person}
            values={values}
            deltas={Object.keys(deltas).length ? deltas : undefined}
            selected={sel}
            onSelect={(k) => {
              setSel((s) => (s === k ? null : k))
              if (metrics.some((m) => m.id === k)) setMetricId(k)
            }}
          />
        </Card>

        <Card>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {metrics.map((m) => (
              <Press key={m.id} onClick={() => setMetricId(m.id)} aria-pressed={metric?.id === m.id} className={`relative h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold ${metric?.id === m.id ? 'text-on-accent' : 'bg-surface-2 text-muted'}`}>
                {metric?.id === m.id && <motion.span layoutId="metric-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
                <span className="relative">{m.label}</span>
              </Press>
            ))}
          </div>
          {metric && (
            <>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">{metric.label}</p>
                  <p className="flex items-baseline gap-1">
                    <AnimatedNumber value={shown[shown.length - 1]?.v ?? 0} decimals={metric.decimals} className="display text-4xl font-semibold" />
                    <span className="text-muted">{metric.unit}</span>
                  </p>
                </div>
                {shown.length > 1 && <Delta d={change} meta={metric} suffix={range ? `en ${RANGES.find((r) => r.id === range)!.label}` : 'en total'} />}
              </div>
              <div className="mt-3">
                <LineChart data={shown} unit={metric.unit} decimals={metric.decimals} color={shown.length > 1 ? TONE_COLOR[tone(change, metric.good)] === 'var(--muted)' ? 'var(--accent)' : TONE_COLOR[tone(change, metric.good)] : 'var(--accent)'} height={220} />
              </div>
              <div className="mt-3 flex rounded-full bg-surface-2 p-0.5">
                {RANGES.map((r) => (
                  <Press key={r.id} onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={`relative h-8 flex-1 rounded-full text-xs font-semibold ${range === r.id ? 'text-on-accent' : 'text-muted'}`}>
                    {range === r.id && <motion.span layoutId="range-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
                    <span className="relative">{r.label}</span>
                  </Press>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, decimals, unit, signed, good }: { label: string; value: number; decimals: number; unit: string; signed?: boolean; good?: 'down' | 'up' }) {
  const t = signed && good ? tone(value, good) : 'flat'
  return (
    <div className="min-w-0 rounded-3xl border border-line bg-surface p-3.5 md:p-4">
      <p className="truncate text-[12px] text-muted md:text-[13px]">{label}</p>
      <p className="mt-1 flex items-baseline gap-0.5" style={{ color: signed && t !== 'flat' ? TONE_COLOR[t] : undefined }}>
        {signed && value !== 0 && <span className="display text-xl font-semibold">{value > 0 ? '+' : '−'}</span>}
        <AnimatedNumber value={signed ? Math.abs(value) : value} decimals={decimals} className="display text-xl font-semibold md:text-2xl" />
        <span className="text-xs text-muted">{unit}</span>
      </p>
    </div>
  )
}
