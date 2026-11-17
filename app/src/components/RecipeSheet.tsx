import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, BookOpen, Check, CopyCheck, Minus, Plus, Repeat2, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { BASE_FOODS, CAT_LABEL, type Food } from '../data/foods'
import { MEAL_LABEL, type Ing, type PlanDoc, type PlanRecipe, type SlotMeal } from '../data/types'
import { longDate } from '../lib/dates'
import { searchOff } from '../lib/off'
import {
  actions,
  activePlan,
  addMacros,
  allPlans,
  findRecipe,
  foodById,
  macrosOf,
  recipeIngs,
  recommended,
  slotItems,
  slotKey,
  useStore,
  ZERO,
} from '../lib/store'
import { usePageViewer } from './PageViewer'
import { AnimatedNumber, Dish, MacroBars, MacroChips, MacroInline, Press, spring } from './ui'

export type SheetTarget = { kind: 'slot'; date: string; slot: SlotMeal } | { kind: 'recipe'; planId: string; id: string }

type FoodTarget = { recipe: string; index: number | 'new'; scope: 'slot' | 'recipe' }
type View = { v: 'detail' } | { v: 'recipes'; replace: string } | ({ v: 'food' } & FoodTarget)

export function RecipeSheet({ target, onClose, date }: { target: SheetTarget | null; onClose: () => void; date: string }) {
  const [view, setView] = useState<View>({ v: 'detail' })
  const [last, setLast] = useState<SheetTarget | null>(target)
  useEffect(() => {
    if (target) {
      setLast(target)
      setView({ v: 'detail' })
    }
  }, [target])
  const t = target ?? last
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [view])

  return (
    <Drawer.Root open={!!target} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-2xl flex-col rounded-t-[32px] border border-line bg-bg outline-none"
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-11 shrink-0 rounded-full bg-surface-2" />
          <div ref={scroller} className="no-scrollbar overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={view.v}
                initial={{ opacity: 0, x: view.v === 'detail' ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: view.v === 'detail' ? 24 : -24, transition: { duration: 0.12 } }}
                transition={spring}
              >
                {t && view.v === 'detail' && t.kind === 'slot' && <SlotDetail t={t} setView={setView} onClose={onClose} />}
                {t && view.v === 'detail' && t.kind === 'recipe' && <LibraryDetail t={t} date={date} setView={setView} onClose={onClose} />}
                {t && t.kind === 'slot' && view.v === 'recipes' && <RecipePicker t={t} replace={view.replace} back={() => setView({ v: 'detail' })} />}
                {t && view.v === 'food' && <FoodPicker t={t} target={view} back={() => setView({ v: 'detail' })} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function SheetHeader({ kicker, title, onClose, onBack }: { kicker?: string; title: string; onClose?: () => void; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-3 pt-3 pb-4">
      {onBack && (
        <Press onClick={onBack} aria-label="Volver" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
          <ArrowLeft className="size-5" />
        </Press>
      )}
      <div className="min-w-0 flex-1">
        {kicker && <p className="text-sm text-muted">{kicker}</p>}
        <Drawer.Title className="display text-[26px] leading-[1.1] font-semibold text-balance">{title}</Drawer.Title>
      </div>
      {onClose && (
        <Press onClick={onClose} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
          <X className="size-5" />
        </Press>
      )}
    </div>
  )
}

// ───────────────────────── Comida de un día ─────────────────────────
function SlotDetail({ t, setView, onClose }: { t: Extract<SheetTarget, { kind: 'slot' }>; setView: (v: View) => void; onClose: () => void }) {
  const state = useStore((s) => s)
  const person = state.person
  const items = slotItems(state, person, t.date, t.slot)
  const total = items.reduce((a, it) => addMacros(a, macrosOf(it.ings, state)), ZERO)
  const key = slotKey(person, t.date, t.slot)
  const done = !!state.people[person].done[key]
  const changed = !!state.people[person].overrides[key]
  const plan = activePlan(state, person, t.date)
  const rec = recommended(state, person, t.date, t.slot)
  const recNames = rec.map((id) => findRecipe(plan, id)?.name).filter(Boolean).join(' + ')
  const ids = items.map((i) => i.recipe.id)
  const isHouse = ids.includes('tostadas-casa')

  return (
    <div>
      <SheetHeader kicker={`${MEAL_LABEL[t.slot]} · ${longDate(t.date)}`} title={items.map((i) => i.recipe.name).join(' + ') || 'Sin plato'} onClose={onClose} />

      {items.length > 1 && (
        <div className="mb-2 rounded-3xl bg-surface p-5">
          <div className="mb-4 flex items-baseline gap-1.5">
            <AnimatedNumber value={total.k} className="display text-4xl font-semibold" />
            <span className="text-muted">kcal en total</span>
          </div>
          <MacroBars m={total} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Press
          onClick={() => actions.toggleDone(person, key)}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-semibold ${done ? 'bg-veg text-on-accent' : 'bg-accent text-on-accent'}`}
        >
          <DoneMark done={done} />
          {done ? 'Comido' : 'Marcar como comido'}
        </Press>
        {changed && (
          <Press onClick={() => actions.resetSlot(person, t.date, t.slot)} className="flex h-12 items-center gap-2 rounded-2xl bg-surface px-4 text-sm font-semibold">
            <RotateCcw className="size-4" /> Deshacer cambios del día
          </Press>
        )}
      </div>

      {t.slot === 'desayuno' && recNames && (
        <Press
          onClick={() => actions.setSlotRecipes(person, t.date, t.slot, isHouse ? rec : ['tostadas-casa'])}
          className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 text-left"
        >
          <Repeat2 className="size-5 shrink-0 text-carb" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{isHouse ? 'Cambiar por el desayuno recomendado' : 'Volver a mis tostadas'}</span>
            {isHouse && <span className="block truncate text-[13px] text-muted">{recNames}</span>}
          </span>
        </Press>
      )}

      {items.map((it) => (
        <RecipeBlock
          key={it.recipe.id}
          recipe={it.recipe}
          ings={it.ings}
          badge={it.edited ? 'Cambiado hoy' : it.recipeEdited ? 'Receta modificada' : undefined}
          onSwap={() => setView({ v: 'recipes', replace: it.recipe.id })}
          onChangeIngs={(ings) => actions.setSlotIngs(person, t.date, t.slot, it.recipe.id, ings)}
          onPickFood={(index) => setView({ v: 'food', recipe: it.recipe.id, index, scope: 'slot' })}
          extra={
            it.edited && it.recipe.id !== 'tostadas-casa' ? (
              <Press
                onClick={() => {
                  actions.setRecipeIngs(person, it.plan.id, it.recipe.id, it.ings)
                  actions.clearSlotIngs(person, t.date, t.slot, it.recipe.id)
                }}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold"
              >
                <CopyCheck className="size-4" /> Guardar estos cambios en la receta para todos los días
              </Press>
            ) : null
          }
        />
      ))}
    </div>
  )
}

function DoneMark({ done }: { done: boolean }) {
  return (
    <span className={`grid size-6 place-items-center rounded-full border-2 ${done ? 'border-on-accent' : 'border-current opacity-60'}`}>
      <AnimatePresence>
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 700, damping: 18 }}>
            <Check className="size-3.5" strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

const step = (g: number) => (g >= 100 ? 10 : 5)

function RecipeBlock({
  recipe,
  ings,
  badge,
  onSwap,
  onChangeIngs,
  onPickFood,
  extra,
}: {
  recipe: PlanRecipe
  ings: Ing[]
  badge?: string
  onSwap?: () => void
  onChangeIngs?: (ings: Ing[]) => void
  onPickFood?: (index: number | 'new') => void
  extra?: React.ReactNode
}) {
  const state = useStore((s) => s)
  const m = macrosOf(ings, state)
  const openPage = usePageViewer()
  const editable = !!onChangeIngs
  const setG = (i: number, g: number) => onChangeIngs?.(ings.map((x, j) => (j === i ? { ...x, g: Math.max(0, Math.round(g)) } : x)))
  const remove = (i: number) => onChangeIngs?.(ings.filter((_, j) => j !== i))

  return (
    <section className="mt-7">
      <div className="flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
          <Dish src={recipe.img} m={m} size={148} />
        </motion.div>
        <h3 className="display mt-4 text-[22px] leading-tight font-semibold text-balance">{recipe.name}</h3>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <MacroChips m={m} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {recipe.yields && <span className="rounded-full bg-surface px-3 py-1 text-[13px] text-muted">{recipe.yields} · cantidades por ración</span>}
          {badge && <span className="rounded-full bg-carb/15 px-3 py-1 text-[13px] font-semibold text-carb">{badge}</span>}
          {recipe.page && (
            <Press onClick={() => openPage([recipe.page!], 0, recipe.name)} className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold">
              <BookOpen className="size-3.5" /> Ver en el PDF
            </Press>
          )}
          {onSwap && (
            <Press onClick={onSwap} className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold">
              <Repeat2 className="size-3.5" /> Cambiar plato
            </Press>
          )}
        </div>
      </div>

      {recipe.note && <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-muted">{recipe.note}</p>}

      <h4 className="mt-6 mb-2 text-sm font-semibold text-muted">Ingredientes{editable ? ' · toca uno para cambiarlo' : ''}</h4>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">
        <AnimatePresence initial={false}>
          {ings.map((ing, i) => {
            const food = foodById(ing.f, state)
            const im = food ? { k: (food.k * ing.g) / 100, p: (food.p * ing.g) / 100, c: (food.c * ing.g) / 100, f: (food.f * ing.g) / 100 } : ZERO
            return (
              <motion.li
                key={`${ing.f}-${i}`}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring}
                className="flex items-center gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => onPickFood?.(i)}
                  className="min-w-0 flex-1 text-left enabled:cursor-pointer"
                  aria-label={editable ? `Cambiar ${food?.n ?? ing.f} por otro alimento` : undefined}
                >
                  <span className="block truncate font-medium">{food?.n ?? ing.f}</span>
                  {ing.t && <span className="block truncate text-[13px] text-muted">{ing.t}</span>}
                  <span className="num mt-0.5 block text-[12px] text-muted">
                    {Math.round(im.k)} kcal · <span className="text-prot">P</span> {fmt(im.p)} · <span className="text-carb">H</span> {fmt(im.c)} · <span className="text-fat">G</span> {fmt(im.f)}
                  </span>
                </button>
                {editable ? (
                  <div className="flex items-center gap-1">
                    <Press onClick={() => (ing.g <= 5 ? remove(i) : setG(i, ing.g - step(ing.g)))} aria-label={ing.g <= 5 ? 'Quitar' : 'Menos'} className="grid size-8 place-items-center rounded-full bg-surface-2">
                      {ing.g <= 5 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                    </Press>
                    <label className="relative">
                      <span className="sr-only">Gramos de {food?.n}</span>
                      <input
                        inputMode="numeric"
                        value={ing.g}
                        onChange={(e) => setG(i, Number(e.target.value.replace(/\D/g, '')) || 0)}
                        className="num w-14 rounded-lg bg-transparent py-1 text-center text-[15px] font-semibold outline-none focus:bg-surface-2"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2 text-[11px] text-muted">g</span>
                    </label>
                    <Press onClick={() => setG(i, ing.g + step(ing.g))} aria-label="Más" className="grid size-8 place-items-center rounded-full bg-surface-2">
                      <Plus className="size-3.5" />
                    </Press>
                  </div>
                ) : (
                  <span className="num shrink-0 font-semibold">{ing.g} g</span>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
        {editable && (
          <li>
            <button type="button" onClick={() => onPickFood?.('new')} className="flex w-full cursor-pointer items-center gap-2 px-4 py-3.5 text-left font-semibold text-veg">
              <Plus className="size-4" /> Añadir ingrediente
            </button>
          </li>
        )}
      </ul>
      {extra}

      <h4 className="mt-6 mb-3 text-sm font-semibold text-muted">Paso a paso</h4>
      <ol className="space-y-3">
        {recipe.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="display num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

const fmt = (n: number) => (n < 10 ? n.toFixed(1).replace('.0', '') : Math.round(n).toString())

// ───────────────────────── Receta desde la biblioteca ─────────────────────────
function LibraryDetail({ t, date, setView, onClose }: { t: Extract<SheetTarget, { kind: 'recipe' }>; date: string; setView: (v: View) => void; onClose: () => void }) {
  const state = useStore((s) => s)
  const person = state.person
  const plan = allPlans(state).find((p) => p.id === t.planId)
  const [used, setUsed] = useState<string | null>(null)
  if (!plan) return null
  const recipe = findRecipe(plan, t.id)
  if (!recipe) return null
  const { ings, edited } = recipeIngs(state, plan, recipe)
  const slots = recipe.meal.filter((m): m is SlotMeal => m !== 'extra')
  return (
    <div>
      <SheetHeader kicker={`${plan.name} · ${recipe.group ?? recipe.meal.map((m) => MEAL_LABEL[m]).join(' / ')}`} title={recipe.name} onClose={onClose} />
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((sl) => (
            <Press
              key={sl}
              onClick={() => {
                actions.setSlotRecipes(person, date, sl, [recipe.id])
                setUsed(sl)
              }}
              className="flex h-11 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-on-accent"
            >
              {used === sl ? <Check className="size-4" /> : <Plus className="size-4" />}
              {used === sl ? 'Puesto en ' : 'Usar en '}
              {MEAL_LABEL[sl].toLowerCase()} · {longDate(date).split(' ').slice(0, 2).join(' ')}
            </Press>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted">Los cambios de ingredientes aquí se guardan en la receta y se aplican a todos los días.</p>
      <RecipeBlock
        recipe={recipe}
        ings={ings}
        badge={edited ? 'Receta modificada' : undefined}
        onChangeIngs={(next) => actions.setRecipeIngs(person, plan.id, recipe.id, next)}
        onPickFood={(index) => setView({ v: 'food', recipe: recipe.id, index, scope: 'recipe' })}
        extra={
          edited ? (
            <Press onClick={() => actions.setRecipeIngs(person, plan.id, recipe.id, null)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold">
              <RotateCcw className="size-4" /> Volver a las cantidades del plan
            </Press>
          ) : null
        }
      />
    </div>
  )
}

// ───────────────────────── Cambiar plato ─────────────────────────
function RecipePicker({ t, replace, back }: { t: Extract<SheetTarget, { kind: 'slot' }>; replace: string; back: () => void }) {
  const state = useStore((s) => s)
  const person = state.person
  const [q, setQ] = useState('')
  const plan = activePlan(state, person, t.date)
  const current = slotItems(state, person, t.date, t.slot).map((i) => i.recipe.id)
  const pool = [...(t.slot === 'desayuno' ? [findRecipe(plan, 'tostadas-casa')!] : []), ...plan.recipes]
  const list = pool.filter((r) => r.meal.includes(t.slot) && norm(r.name).includes(norm(q)))
  const pick = (id: string) => {
    actions.setSlotRecipes(person, t.date, t.slot, current.map((c) => (c === replace ? id : c)))
    back()
  }
  return (
    <div>
      <SheetHeader kicker={`Cambiar ${findRecipe(plan, replace)?.name ?? ''}`} title={`Otra opción de ${MEAL_LABEL[t.slot].toLowerCase()}`} onBack={back} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar receta" />
      <ul className="mt-3 space-y-2">
        {list.map((r) => {
          const m = macrosOf(recipeIngs(state, plan, r).ings, state)
          const isCurrent = current.includes(r.id)
          return (
            <li key={r.id}>
              <Press
                whileHover={{ scale: 1.01 }}
                onClick={() => pick(r.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${isCurrent ? 'bg-accent text-on-accent' : 'bg-surface'}`}
              >
                <Dish src={r.img} m={m} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-medium">{r.name}</span>
                  <MacroInline m={m} className={isCurrent ? 'text-on-accent/70' : ''} />
                </span>
                <span className="num shrink-0 text-sm font-semibold">{Math.round(m.k)} kcal</span>
              </Press>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ───────────────────────── Cambiar / añadir ingrediente ─────────────────────────
function FoodPicker({ t, target, back }: { t: SheetTarget; target: FoodTarget; back: () => void }) {
  const state = useStore((s) => s)
  const person = state.person
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState<{ status: 'idle' | 'loading' | 'done'; items: Food[]; msg?: string }>({ status: 'idle', items: [] })

  // Ingredientes actuales según dónde se edita
  let plan: PlanDoc | undefined
  let ings: Ing[] = []
  if (t.kind === 'slot') {
    const item = slotItems(state, person, t.date, t.slot).find((i) => i.recipe.id === target.recipe)
    plan = item?.plan
    ings = item?.ings ?? []
  } else {
    plan = allPlans(state).find((p) => p.id === t.planId)
    const r = plan && findRecipe(plan, target.recipe)
    if (plan && r) ings = recipeIngs(state, plan, r).ings
  }
  const current = typeof target.index === 'number' ? ings[target.index] : undefined
  const currentFood = current ? foodById(current.f, state) : undefined

  const local = useMemo(() => {
    const all = [...Object.values(BASE_FOODS), ...Object.values(state.shared.customFoods)]
    const nq = norm(q)
    const list = nq ? all.filter((f) => norm(f.n).includes(nq)) : all.filter((f) => !currentFood || f.cat === currentFood.cat)
    return list.slice(0, 40)
  }, [q, state.shared.customFoods, currentFood])

  const save = (next: Ing[]) => {
    if (t.kind === 'slot') actions.setSlotIngs(person, t.date, t.slot, target.recipe, next)
    else if (plan) actions.setRecipeIngs(person, plan.id, target.recipe, next)
  }
  const choose = (food: Food) => {
    if (food.custom && !state.shared.customFoods[food.id]) actions.addCustomFoods([food])
    const next =
      target.index === 'new'
        ? [...ings, { f: food.id, g: 100 }]
        : ings.map((x, j) => (j === target.index ? { f: food.id, g: equivalent(currentFood, food, x.g), t: undefined } : x))
    save(next)
    back()
  }

  const searchRemote = async () => {
    if (q.trim().length < 2) return
    setRemote({ status: 'loading', items: [] })
    try {
      const items = await searchOff(q.trim())
      setRemote({ status: 'done', items, msg: items.length ? undefined : 'No hay productos con ese nombre. Prueba con la marca o una palabra más corta.' })
    } catch {
      setRemote({ status: 'done', items: [], msg: 'Sin conexión con Open Food Facts. Revisa internet y vuelve a buscar.' })
    }
  }

  return (
    <div>
      <SheetHeader
        kicker={currentFood ? `Sustituir ${currentFood.n} · ${current?.g} g` : undefined}
        title={target.index === 'new' ? 'Añadir ingrediente' : 'Cambiar ingrediente'}
        onBack={back}
      />
      <SearchBox value={q} onChange={(v) => { setQ(v); setRemote({ status: 'idle', items: [] }) }} placeholder="Pollo, kéfir, Santivery…" onSubmit={searchRemote} />
      {!q && currentFood && (
        <p className="mt-3 text-sm text-muted">
          Alternativas del grupo {CAT_LABEL[currentFood.cat].toLowerCase()}.{' '}
          {KEY_MACRO[currentFood.cat] ? `Los gramos se ajustan para mantener ${KEY_LABEL[KEY_MACRO[currentFood.cat]!]} que el original.` : 'Se mantienen los gramos.'}
        </p>
      )}
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-surface">
        {local.map((f) => (
          <FoodRow key={f.id} food={f} grams={current ? equivalent(currentFood, f, current.g) : 100} onPick={() => choose(f)} />
        ))}
        {local.length === 0 && <li className="px-4 py-4 text-sm text-muted">No está en la lista. Búscalo en los productos de supermercado.</li>}
      </ul>
      {q.trim().length >= 2 && (
        <div className="mt-5">
          <Press onClick={searchRemote} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 text-sm font-semibold">
            {remote.status === 'loading' ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} className="block size-4 rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search className="size-4" />
            )}
            Buscar «{q.trim()}» en productos de supermercado
          </Press>
          {remote.msg && <p className="mt-3 text-sm text-muted">{remote.msg}</p>}
          {remote.items.length > 0 && (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-surface">
              {remote.items.map((f) => (
                <FoodRow key={f.id} food={f} grams={current ? equivalent(currentFood, f, current.g) : 100} onPick={() => choose(f)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function FoodRow({ food, grams, onPick }: { food: Food; grams: number; onPick: () => void }) {
  const m = { k: (food.k * grams) / 100, p: (food.p * grams) / 100, c: (food.c * grams) / 100, f: (food.f * grams) / 100 }
  return (
    <li>
      <button type="button" onClick={onPick} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{food.n}</span>
          <MacroInline m={m} />
        </span>
        <span className="num shrink-0 text-sm text-muted">
          <span className="font-semibold text-ink">{Math.round(m.k)}</span> kcal / {grams} g
        </span>
      </button>
    </li>
  )
}

function SearchBox({ value, onChange, placeholder, onSubmit }: { value: string; onChange: (v: string) => void; placeholder: string; onSubmit?: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className="flex h-12 items-center gap-2 rounded-2xl bg-surface px-4"
    >
      <Search className="size-4 text-muted" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
    </form>
  )
}

export const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const KEY_MACRO: Partial<Record<Food['cat'], 'p' | 'c' | 'f'>> = { hidrato: 'c', proteina: 'p', grasa: 'f' }
const KEY_LABEL = { p: 'la misma proteína', c: 'los mismos hidratos', f: 'la misma grasa' }

/** Gramos equivalentes al cambiar un alimento por otro del mismo grupo */
export function equivalent(from: Food | undefined, to: Food, g: number): number {
  const key = from ? KEY_MACRO[from.cat] : undefined
  if (!from || !key || from.cat !== to.cat || from[key] < 1 || to[key] < 1) return g
  return Math.max(5, Math.round((g * from[key]) / to[key] / 5) * 5)
}
