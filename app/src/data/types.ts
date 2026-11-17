import type { Food } from './foods'

export type PersonId = 'fran' | 'lua'
export type Meal = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'extra'
export type SlotMeal = Exclude<Meal, 'extra'>

export const SLOTS: SlotMeal[] = ['desayuno', 'comida', 'merienda', 'cena']
export const SLOT_HOUR: Record<SlotMeal, string> = { desayuno: '08:00', comida: '14:30', merienda: '18:00', cena: '21:00' }
export const MEAL_LABEL: Record<Meal, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  extra: 'Extras',
}

export interface Ing {
  f: string
  g: number
  t?: string
}

export interface PlanRecipe {
  id: string
  name: string
  meal: Meal[]
  group?: string
  ing: Ing[]
  steps: string[]
  note?: string
  yields?: string
  /** Foto de la receta (ruta o data URL) */
  img?: string
  /** Página original del PDF (ruta o data URL) */
  page?: string
}

export type DayPlan = Record<SlotMeal, string[]>

export interface GuideTable {
  head: string[]
  rows: string[][]
}

export interface GuideSection {
  id: string
  title: string
  tone: 'veg' | 'carb' | 'prot' | 'fat'
  intro?: string
  bullets?: string[]
  table?: GuideTable
  img?: string
  pages?: string[]
}

export interface PlanDoc {
  id: string
  name: string
  person: PersonId
  /** Lunes en que empieza la semana 1 (YYYY-MM-DD) */
  startDate: string
  createdAt: number
  updatedAt: number
  source: 'seed' | 'import'
  weeks: DayPlan[][]
  recipes: PlanRecipe[]
  guide: GuideSection[]
  foods?: Food[]
  notes?: string[]
  pages?: string[]
  /** Fila en Supabase */
  rowId?: number
  deleted?: boolean
}
