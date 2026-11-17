import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, FileUp, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { BASE_FOODS, type Food } from '../data/foods'
import { MEAL_LABEL, SLOTS, type PersonId, type PlanDoc, type PlanRecipe } from '../data/types'
import { DAY_SHORT, addDays, mondayOf, today } from '../lib/dates'
import { parsePlanWithClaude, type ParsedPlan } from '../lib/claude'
import { cropPhoto, readPdf, type PdfPage } from '../lib/pdf'
import { actions, macrosOf, useStore } from '../lib/store'
import { Dish, MacroChips, Press, spring } from './ui'

type Step =
  | { s: 'form' }
  | { s: 'reading'; done: number; total: number }
  | { s: 'claude'; chars: number }
  | { s: 'photos' }
  | { s: 'review'; plan: PlanDoc; foods: Food[] }
  | { s: 'error'; msg: string }

export default function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore((s) => s)
  const [step, setStep] = useState<Step>({ s: 'form' })
  const [file, setFile] = useState<File | null>(null)
  const [person, setPerson] = useState<PersonId>(state.person)
  const [start, setStart] = useState(addDays(mondayOf(today()), 7))
  const abort = useRef<AbortController | null>(null)

  const run = async () => {
    if (!file) return
    abort.current = new AbortController()
    try {
      setStep({ s: 'reading', done: 0, total: 0 })
      const pages = await readPdf(file, (done, total) => setStep({ s: 'reading', done, total }))
      setStep({ s: 'claude', chars: 0 })
      const parsed = await parsePlanWithClaude({
        apiKey: state.apiKey,
        person,
        personName: state.shared.names[person],
        pages,
        signal: abort.current.signal,
        onProgress: (chars) => setStep({ s: 'claude', chars }),
      })
      setStep({ s: 'photos' })
      const { plan, foods } = await buildPlan(parsed, pages, person, start)
      setStep({ s: 'review', plan, foods })
    } catch (e) {
      if (abort.current?.signal.aborted) return setStep({ s: 'form' })
      setStep({ s: 'error', msg: errorText(e) })
    }
  }

  const close = () => {
    abort.current?.abort()
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && close()} dismissible={step.s !== 'claude' && step.s !== 'reading'}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[96dvh] max-w-2xl flex-col rounded-t-[32px] border border-line bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-surface-2" />
          <div className="no-scrollbar overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
            <div className="flex items-center justify-between pt-4 pb-4">
              <Drawer.Title className="display text-2xl font-semibold">Añadir un plan nuevo</Drawer.Title>
              <Press onClick={close} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-surface">
                <X className="size-5" />
              </Press>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step.s} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={spring}>
                {step.s === 'form' && (
                  <Form
                    file={file}
                    setFile={setFile}
                    person={person}
                    setPerson={setPerson}
                    start={start}
                    setStart={setStart}
                    hasKey={!!state.apiKey}
                    onRun={run}
                  />
                )}
                {step.s === 'reading' && <Progress title="Leyendo las páginas del PDF" detail={step.total ? `${step.done} de ${step.total} páginas` : 'Abriendo el archivo…'} value={step.total ? step.done / step.total : 0} />}
                {step.s === 'claude' && (
                  <Progress
                    title="Claude está leyendo el plan"
                    detail={step.chars ? `Recetas, cantidades y menú… (${Math.round(step.chars / 1000)} mil caracteres)` : 'Analizando páginas y fotos. Puede tardar unos minutos.'}
                    onCancel={() => abort.current?.abort()}
                  />
                )}
                {step.s === 'photos' && <Progress title="Recortando las fotos de las recetas" detail="Casi listo" />}
                {step.s === 'error' && (
                  <div className="rounded-3xl bg-surface p-5">
                    <p className="flex items-center gap-2 font-semibold text-prot">
                      <AlertTriangle className="size-5" /> No se pudo importar
                    </p>
                    <p className="mt-2 text-muted">{step.msg}</p>
                    <Press onClick={() => setStep({ s: 'form' })} className="mt-4 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent">
                      Volver a intentarlo
                    </Press>
                  </div>
                )}
                {step.s === 'review' && (
                  <Review
                    plan={step.plan}
                    foods={step.foods}
                    onChange={(plan) => setStep({ ...step, plan })}
                    onSave={() => {
                      actions.addCustomFoods(step.foods)
                      actions.savePlan(step.plan)
                      onClose()
                    }}
                    onDiscard={() => setStep({ s: 'form' })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function errorText(e: unknown): string {
  const status = (e as { status?: number })?.status
  if (status === 401) return 'La clave de Claude no es válida. Revísala en Planes y ajustes.'
  if (status === 429) return 'Claude está saturado o se ha superado el límite de uso. Espera un minuto y vuelve a intentarlo.'
  if (status === 413) return 'El PDF es demasiado grande para enviarlo de una vez. Divide el PDF en dos partes.'
  if (status && status >= 500) return 'Claude no responde ahora mismo. Vuelve a intentarlo en unos minutos.'
  return e instanceof Error ? e.message : 'Error desconocido al leer el plan.'
}

function Form(p: {
  file: File | null
  setFile: (f: File | null) => void
  person: PersonId
  setPerson: (p: PersonId) => void
  start: string
  setStart: (d: string) => void
  hasKey: boolean
  onRun: () => void
}) {
  const names = useStore((s) => s.shared.names)
  const apiKey = useStore((s) => s.apiKey)
  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-surface px-5 py-8 text-center">
        <FileUp className="size-8 text-carb" />
        <span className="font-semibold">{p.file ? p.file.name : 'Elige el PDF de la nutricionista'}</span>
        <span className="text-sm text-muted">{p.file ? `${(p.file.size / 1e6).toFixed(1)} MB` : 'Desde el móvil o el ordenador'}</span>
        <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => p.setFile(e.target.files?.[0] ?? null)} />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">¿De quién es este plan?</legend>
        <div className="flex gap-2">
          {(['fran', 'lua'] as PersonId[]).map((id) => (
            <Press key={id} onClick={() => p.setPerson(id)} aria-pressed={p.person === id} className={`relative h-12 flex-1 rounded-2xl font-semibold ${p.person === id ? 'text-on-accent' : 'bg-surface'}`}>
              {p.person === id && <motion.span layoutId="import-person" transition={spring} className="absolute inset-0 rounded-2xl bg-accent" />}
              <span className="relative">{names[id]}</span>
            </Press>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm text-muted">Empieza el lunes</span>
        <input type="date" value={p.start} onChange={(e) => e.target.value && p.setStart(mondayOf(e.target.value))} className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-carb" />
      </label>

      {!p.hasKey && (
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Clave de Claude (solo se guarda en este dispositivo)</span>
          <input type="password" autoComplete="off" value={apiKey} onChange={(e) => actions.setApiKey(e.target.value.trim())} placeholder="sk-ant-…" className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-carb" />
        </label>
      )}

      <Press onClick={p.onRun} disabled={!p.file || !apiKey} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40">
        <Sparkles className="size-5" /> Leer el plan con Claude
      </Press>
      <p className="text-center text-[13px] text-muted">Podrás revisar y corregir todo antes de guardarlo.</p>
    </div>
  )
}

function Progress({ title, detail, value, onCancel }: { title: string; detail: string; value?: number; onCancel?: () => void }) {
  return (
    <div className="rounded-3xl bg-surface p-6 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} className="mx-auto size-10 rounded-full border-4 border-carb border-t-transparent" />
      <p className="display mt-4 text-xl font-semibold">{title}</p>
      <p className="mt-1 text-muted" aria-live="polite">
        {detail}
      </p>
      {value !== undefined && (
        <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-carb" animate={{ width: `${Math.max(4, value * 100)}%` }} transition={spring} />
        </div>
      )}
      {onCancel && (
        <Press onClick={onCancel} className="mt-5 h-11 rounded-2xl bg-surface-2 px-5 text-sm font-semibold">
          Cancelar
        </Press>
      )}
    </div>
  )
}

function Review({ plan, foods, onChange, onSave, onDiscard }: { plan: PlanDoc; foods: Food[]; onChange: (p: PlanDoc) => void; onSave: () => void; onDiscard: () => void }) {
  const state = useStore((s) => s)
  const [openId, setOpenId] = useState<string | null>(null)
  const ids = new Set(plan.recipes.map((r) => r.id))
  const missing = [...new Set(plan.weeks.flat().flatMap((d) => SLOTS.flatMap((s) => d[s])).filter((id) => !ids.has(id)))]
  const known = (f: string) => !!BASE_FOODS[f] || foods.some((x) => x.id === f) || !!state.shared.customFoods[f]
  const macros = (r: PlanRecipe) => macrosOf(r.ing, { ...state, shared: { ...state.shared, customFoods: { ...state.shared.customFoods, ...Object.fromEntries(foods.map((f) => [f.id, f])) } } })
  const updateRecipe = (r: PlanRecipe) => onChange({ ...plan, recipes: plan.recipes.map((x) => (x.id === r.id ? r : x)) })
  const recipeName = (id: string) => plan.recipes.find((r) => r.id === id)?.name ?? id

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Nombre del plan</span>
        <input value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })} className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base font-semibold outline-none focus:border-carb" />
      </label>
      <p className="mt-3 text-sm text-muted">
        {plan.weeks.length} semanas · {plan.recipes.length} recetas · {plan.recipes.filter((r) => r.img).length} con foto · {foods.length} alimentos nuevos
      </p>
      {missing.length > 0 && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-prot/10 px-4 py-3 text-sm text-prot">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> El menú cita platos que no se han encontrado: {missing.join(', ')}. Se mostrarán vacíos.
        </p>
      )}

      <h3 className="display mt-6 text-lg font-semibold">Menú</h3>
      {plan.weeks.map((w, wi) => (
        <details key={wi} className="mt-2 rounded-2xl bg-surface px-4 py-3" open={wi === 0}>
          <summary className="cursor-pointer font-semibold">Semana {wi + 1}</summary>
          <ul className="mt-2 space-y-2 text-sm">
            {w.map((d, di) => (
              <li key={di} className="border-t border-line pt-2">
                <span className="font-semibold">{DAY_SHORT[di]}</span>{' '}
                {SLOTS.map((s) => (d[s].length ? `${MEAL_LABEL[s]}: ${d[s].map(recipeName).join(' + ')}` : null)).filter(Boolean).join(' · ')}
              </li>
            ))}
          </ul>
        </details>
      ))}

      <h3 className="display mt-6 text-lg font-semibold">Recetas</h3>
      <p className="text-sm text-muted">Toca una receta para revisar sus cantidades.</p>
      <ul className="mt-3 space-y-2">
        {plan.recipes.map((r) => {
          const m = macros(r)
          const unknown = r.ing.filter((i) => !known(i.f))
          const isOpen = openId === r.id
          return (
            <li key={r.id} className="rounded-3xl bg-surface">
              <button type="button" onClick={() => setOpenId(isOpen ? null : r.id)} className="flex w-full cursor-pointer items-center gap-3 p-3 text-left">
                <Dish src={r.img} m={m} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.name}</span>
                  <MacroChips m={m} className="mt-1" />
                  {unknown.length > 0 && <span className="mt-1 block text-[13px] text-prot">Sin datos de: {unknown.map((u) => u.f).join(', ')}</span>}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-2 px-4 pb-4">
                  <input value={r.name} onChange={(e) => updateRecipe({ ...r, name: e.target.value })} aria-label="Nombre de la receta" className="h-11 w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-carb" />
                  {r.ing.map((i, k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {BASE_FOODS[i.f]?.n ?? foods.find((f) => f.id === i.f)?.n ?? i.f}
                        {i.t && <span className="text-muted"> · {i.t}</span>}
                      </span>
                      <input
                        inputMode="numeric"
                        value={i.g}
                        onChange={(e) => updateRecipe({ ...r, ing: r.ing.map((x, j) => (j === k ? { ...x, g: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)) })}
                        className="num h-9 w-16 rounded-lg border border-line bg-bg text-center outline-none focus:border-carb"
                        aria-label={`Gramos de ${i.f}`}
                      />
                      <span className="text-muted">g</span>
                    </label>
                  ))}
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
                    {r.steps.map((s, k) => (
                      <li key={k}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-0 mt-6 flex gap-2 bg-bg pt-3">
        <Press onClick={onDiscard} className="h-14 rounded-2xl bg-surface px-5 font-semibold">
          Descartar
        </Press>
        <Press onClick={onSave} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-on-accent">
          <Check className="size-5" /> Guardar plan
        </Press>
      </div>
    </div>
  )
}

async function buildPlan(parsed: ParsedPlan, pages: PdfPage[], person: PersonId, startDate: string): Promise<{ plan: PlanDoc; foods: Food[] }> {
  const pageThumb = (n: number) => pages[n - 1]?.thumb
  const photoOf = async (id: string, box: number[], page: number) => {
    for (const p of pages) {
      const f = id ? p.photos.find((x) => x.id === id) : undefined
      if (f) return cropPhoto(p, f.box)
    }
    if (box.length === 4 && pages[page - 1]) return cropPhoto(pages[page - 1], box as [number, number, number, number])
    return undefined
  }
  const recipes: PlanRecipe[] = []
  for (const r of parsed.recipes) {
    recipes.push({
      id: r.id,
      name: r.name,
      meal: r.meal.length ? r.meal : ['extra'],
      group: r.group || undefined,
      ing: r.ing.filter((i) => i.g > 0).map((i) => ({ f: i.f, g: Math.round(i.g), t: i.t || undefined })),
      steps: r.steps,
      note: r.note || undefined,
      yields: r.yields || undefined,
      img: await photoOf(r.photo, r.photoBox, r.page),
      page: r.page ? pageThumb(r.page) : undefined,
    })
  }
  const foods: Food[] = parsed.foods.filter((f) => !BASE_FOODS[f.id]).map((f) => ({ ...f, custom: true }))
  const now = Date.now()
  return {
    foods,
    plan: {
      id: `plan-${now.toString(36)}`,
      name: parsed.name || 'Plan nuevo',
      person,
      startDate,
      createdAt: now,
      updatedAt: now,
      source: 'import',
      weeks: parsed.weeks.length ? parsed.weeks : [[]],
      recipes,
      guide: parsed.guide.map((g, i) => ({
        id: `g${i}`,
        title: g.title,
        intro: g.intro || undefined,
        bullets: g.bullets.length ? g.bullets : undefined,
        tone: g.tone,
        pages: g.pages.map(pageThumb).filter((x): x is string => !!x),
      })),
      notes: parsed.notes,
      pages: pages.map((p) => p.thumb),
    },
  }
}
