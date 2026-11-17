import { useSyncExternalStore } from 'react'
import { BASE_FOODS, type Food } from '../data/foods'
import { HOUSE_BREAKFAST, SEED_PLANS } from '../data/seed'
import type { DayPlan, Ing, PersonId, PlanDoc, PlanRecipe, SlotMeal } from '../data/types'
import { dayIndex, mondayOf, weekNumber } from './dates'
import { idbGet, idbSet } from './idb'

export type { Ing }

export interface SlotOverride {
  recipes?: string[]
  ing?: Record<string, Ing[]>
}

/** Datos de cada persona (se sincronizan en su propia fila) */
export interface PersonDoc {
  overrides: Record<string, SlotOverride>
  done: Record<string, boolean>
  /** Cambios permanentes en recetas: `${planId}:${recipeId}` */
  recipeEdits: Record<string, Ing[]>
  /** true = desayuno de casa (2 tostadas); false = el del plan */
  houseBreakfast: boolean
  updatedAt: number
}

/** Datos compartidos */
export interface SharedDoc {
  names: Record<PersonId, string>
  customFoods: Record<string, Food>
  /** Cambios sobre los planes iniciales (fecha de inicio, ocultar) */
  planMeta: Record<string, { startDate?: string; deleted?: boolean }>
  updatedAt: number
}

export type SyncStatus = 'off' | 'connecting' | 'ok' | 'error'

export interface State {
  person: PersonId
  apiKey: string
  shared: SharedDoc
  people: Record<PersonId, PersonDoc>
  /** Planes importados */
  plans: Record<string, PlanDoc>
  sync: { status: SyncStatus; message?: string }
}

const KEY = 'plato.v2'
const emptyPerson = (): PersonDoc => ({ overrides: {}, done: {}, recipeEdits: {}, houseBreakfast: true, updatedAt: 0 })
const DEFAULT: State = {
  person: 'fran',
  apiKey: '',
  shared: { names: { fran: 'Francisco', lua: 'Lua' }, customFoods: {}, planMeta: {}, updatedAt: 0 },
  people: { fran: emptyPerson(), lua: emptyPerson() },
  plans: {},
  sync: { status: 'off' },
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>
      return {
        ...DEFAULT,
        ...s,
        shared: { ...DEFAULT.shared, ...s.shared },
        people: { fran: { ...emptyPerson(), ...s.people?.fran }, lua: { ...emptyPerson(), ...s.people?.lua } },
        plans: {},
        sync: { status: 'off' },
      }
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return DEFAULT
}

let state: State = load()
const listeners = new Set<() => void>()
type Change = { shared?: boolean; person?: PersonId; plan?: string }
const changeListeners = new Set<(c: Change) => void>()

let lastPlans: State['plans'] = state.plans
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, plans: undefined, sync: undefined }))
  } catch {
    /* sin espacio: los datos siguen en memoria y en la nube */
  }
  if (state.plans !== lastPlans) {
    lastPlans = state.plans
    void idbSet('plans', state.plans)
  }
}

// Los planes importados (con fotos) viven en IndexedDB
void idbGet<State['plans']>('plans').then((plans) => {
  if (plans && Object.keys(plans).length) {
    state = { ...state, plans: { ...plans, ...state.plans } }
    lastPlans = state.plans
    listeners.forEach((l) => l())
  }
})

export function setState(fn: (s: State) => State, change?: Change) {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
  if (change) changeListeners.forEach((l) => l(change))
}

export const onChange = (fn: (c: Change) => void) => {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => sel(state),
  )
}

export const getState = () => state

// ───────── planes ─────────
export function allPlans(s: State = state): PlanDoc[] {
  const seeds = SEED_PLANS.map((p) => ({ ...p, ...s.shared.planMeta[p.id] }))
  return [...seeds, ...Object.values(s.plans)].filter((p) => !p.deleted)
}

export function plansOf(s: State, p: PersonId): PlanDoc[] {
  return allPlans(s)
    .filter((x) => x.person === p)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt)
}

/** Plan vigente en una fecha: el último que ya ha empezado */
export function activePlan(s: State, p: PersonId, date: string): PlanDoc {
  const list = plansOf(s, p)
  const monday = mondayOf(date)
  const started = list.filter((x) => mondayOf(x.startDate) <= monday)
  return started[started.length - 1] ?? list[0] ?? SEED_PLANS.find((x) => x.person === p)!
}

export function planDay(plan: PlanDoc, date: string): { day: DayPlan; week: number } {
  const n = plan.weeks.length || 1
  const w = ((weekNumber(plan.startDate, date) % n) + n) % n
  return { day: plan.weeks[w]?.[dayIndex(date)] ?? { desayuno: [], comida: [], merienda: [], cena: [] }, week: w }
}

export function findRecipe(plan: PlanDoc, id: string): PlanRecipe | undefined {
  if (id === 'tostadas-casa') return HOUSE_BREAKFAST[plan.person]
  return plan.recipes.find((r) => r.id === id)
}

export const editKey = (planId: string, recipeId: string) => `${planId}:${recipeId}`

/** Ingredientes de la receta con los cambios permanentes aplicados */
export function recipeIngs(s: State, plan: PlanDoc, r: PlanRecipe): { ings: Ing[]; edited: boolean } {
  const e = s.people[plan.person].recipeEdits[editKey(plan.id, r.id)]
  return { ings: e ?? r.ing, edited: !!e }
}

export function foodById(id: string, s: State = state): Food | undefined {
  return BASE_FOODS[id] ?? s.shared.customFoods[id]
}

export const slotKey = (p: PersonId, date: string, slot: SlotMeal) => `${p}|${date}|${slot}`

/** Lo que recomienda el plan para esa comida */
export function recommended(s: State, p: PersonId, date: string, slot: SlotMeal): string[] {
  return planDay(activePlan(s, p, date), date).day[slot] ?? []
}

export function defaultRecipes(s: State, p: PersonId, date: string, slot: SlotMeal): string[] {
  if (slot === 'desayuno' && s.people[p].houseBreakfast) return ['tostadas-casa']
  return recommended(s, p, date, slot)
}

export interface SlotItem {
  recipe: PlanRecipe
  ings: Ing[]
  /** Cambiado solo para este día */
  edited: boolean
  /** Cambiado en la receta (todos los días) */
  recipeEdited: boolean
  plan: PlanDoc
}

export function slotItems(s: State, p: PersonId, date: string, slot: SlotMeal): SlotItem[] {
  const plan = activePlan(s, p, date)
  const o = s.people[p].overrides[slotKey(p, date, slot)]
  const ids = o?.recipes ?? defaultRecipes(s, p, date, slot)
  return ids
    .map((id) => findRecipe(plan, id))
    .filter((r): r is PlanRecipe => !!r)
    .map((r) => {
      const base = recipeIngs(s, plan, r)
      const day = o?.ing?.[r.id]
      return { recipe: r, ings: day ?? base.ings, edited: !!day, recipeEdited: base.edited, plan }
    })
}

export interface Macros {
  k: number
  p: number
  c: number
  f: number
}
export const ZERO: Macros = { k: 0, p: 0, c: 0, f: 0 }

export function macrosOf(ings: Ing[], s: State = state): Macros {
  return ings.reduce<Macros>((acc, i) => {
    const food = foodById(i.f, s)
    if (!food) return acc
    const m = i.g / 100
    return { k: acc.k + food.k * m, p: acc.p + food.p * m, c: acc.c + food.c * m, f: acc.f + food.f * m }
  }, ZERO)
}

export const addMacros = (a: Macros, b: Macros): Macros => ({ k: a.k + b.k, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f })

// ───────── acciones ─────────
const now = () => Date.now()
function person(p: PersonId, fn: (d: PersonDoc) => Partial<PersonDoc>) {
  setState((s) => ({ ...s, people: { ...s.people, [p]: { ...s.people[p], ...fn(s.people[p]), updatedAt: now() } } }), { person: p })
}
function shared(fn: (d: SharedDoc) => Partial<SharedDoc>) {
  setState((s) => ({ ...s, shared: { ...s.shared, ...fn(s.shared), updatedAt: now() } }), { shared: true })
}

export const actions = {
  setPerson: (p: PersonId) => setState((s) => ({ ...s, person: p })),
  setApiKey: (apiKey: string) => setState((s) => ({ ...s, apiKey })),
  setSync: (sync: State['sync']) => setState((s) => ({ ...s, sync })),
  setName: (p: PersonId, name: string) => shared((d) => ({ names: { ...d.names, [p]: name } })),
  addCustomFoods: (foods: Food[]) =>
    shared((d) => ({ customFoods: { ...d.customFoods, ...Object.fromEntries(foods.map((f) => [f.id, f])) } })),
  toggleDone: (p: PersonId, key: string) => person(p, (d) => ({ done: { ...d.done, [key]: !d.done[key] } })),
  setHouseBreakfast: (p: PersonId, v: boolean) => person(p, () => ({ houseBreakfast: v })),
  setSlotRecipes(p: PersonId, date: string, slot: SlotMeal, recipes: string[]) {
    person(p, (d) => ({ overrides: { ...d.overrides, [slotKey(p, date, slot)]: { recipes } } }))
  },
  setSlotIngs(p: PersonId, date: string, slot: SlotMeal, recipeId: string, ings: Ing[]) {
    const k = slotKey(p, date, slot)
    person(p, (d) => {
      const prev = d.overrides[k] ?? {}
      return { overrides: { ...d.overrides, [k]: { ...prev, ing: { ...prev.ing, [recipeId]: ings } } } }
    })
  },
  clearSlotIngs(p: PersonId, date: string, slot: SlotMeal, recipeId: string) {
    const k = slotKey(p, date, slot)
    person(p, (d) => {
      const prev = d.overrides[k]
      if (!prev?.ing) return {}
      const ing = { ...prev.ing }
      delete ing[recipeId]
      const next: SlotOverride = { ...prev, ing }
      const overrides = { ...d.overrides }
      if (!next.recipes && !Object.keys(ing).length) delete overrides[k]
      else overrides[k] = next
      return { overrides }
    })
  },
  resetSlot(p: PersonId, date: string, slot: SlotMeal) {
    person(p, (d) => {
      const overrides = { ...d.overrides }
      delete overrides[slotKey(p, date, slot)]
      return { overrides }
    })
  },
  setRecipeIngs(p: PersonId, planId: string, recipeId: string, ings: Ing[] | null) {
    person(p, (d) => {
      const recipeEdits = { ...d.recipeEdits }
      if (ings) recipeEdits[editKey(planId, recipeId)] = ings
      else delete recipeEdits[editKey(planId, recipeId)]
      return { recipeEdits }
    })
  },
  setPlanStart(plan: PlanDoc, startDate: string) {
    if (plan.source === 'seed') shared((d) => ({ planMeta: { ...d.planMeta, [plan.id]: { ...d.planMeta[plan.id], startDate } } }))
    else actions.savePlan({ ...plan, startDate })
  },
  savePlan(plan: PlanDoc) {
    const p = { ...plan, updatedAt: now() }
    setState((s) => ({ ...s, plans: { ...s.plans, [p.id]: p } }), { plan: p.id })
  },
  deletePlan(plan: PlanDoc) {
    if (plan.source === 'seed') shared((d) => ({ planMeta: { ...d.planMeta, [plan.id]: { ...d.planMeta[plan.id], deleted: true } } }))
    else actions.savePlan({ ...plan, deleted: true, recipes: [], pages: [], guide: [] })
  },
  resetPerson: (p: PersonId) => person(p, (d) => ({ ...emptyPerson(), houseBreakfast: d.houseBreakfast })),
  // ── aplicar datos llegados de la nube ──
  applyRemote(r: { shared?: SharedDoc; people?: Partial<Record<PersonId, PersonDoc>>; plans?: PlanDoc[] }) {
    setState((s) => {
      let next = s
      if (r.shared && r.shared.updatedAt > s.shared.updatedAt) next = { ...next, shared: { ...DEFAULT.shared, ...r.shared } }
      for (const p of ['fran', 'lua'] as PersonId[]) {
        const d = r.people?.[p]
        if (d && d.updatedAt > next.people[p].updatedAt) next = { ...next, people: { ...next.people, [p]: { ...emptyPerson(), ...d } } }
      }
      for (const plan of r.plans ?? []) {
        const cur = next.plans[plan.id]
        if (!cur || plan.updatedAt > cur.updatedAt) next = { ...next, plans: { ...next.plans, [plan.id]: plan } }
      }
      return next
    })
  },
}
