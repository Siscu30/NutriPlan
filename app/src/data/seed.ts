// Planes iniciales construidos a partir de los PDFs de noviembre.
import media from './media.json'
import { GUIDE } from './guide'
import { MERIENDA_ROTATION, MENU_NOTES, WEEK_MENUS } from './plan'
import { RECIPES } from './recipes'
import type { GuideSection, PersonId, PlanDoc, PlanRecipe } from './types'

type Media = Record<PersonId, { pages: number; img: Record<string, number | null> }>
const M = media as Media

const imgOf = (p: PersonId, id: string) => {
  if (id in M[p].img) return M[p].img[id] === null ? `/img/lua/${id}.jpg` : `/img/${p}/${id}.jpg`
  return undefined
}
const page = (p: PersonId, n: number) => `/pages/${p}/${n}.jpg`
const pageOf = (p: PersonId, id: string) => {
  const n = M[p].img[id]
  if (n) return page(p, n)
  const o: PersonId = p === 'fran' ? 'lua' : 'fran'
  const m = M[o].img[id]
  return m ? page(o, m) : undefined
}

/** Desayuno de casa: 2 tostadas (por defecto todos los días) */
export const HOUSE_BREAKFAST: Record<PersonId, PlanRecipe> = {
  fran: {
    id: 'tostadas-casa',
    name: 'Dos tostadas: huevo con cottage y jamón',
    meal: ['desayuno'],
    img: '/img/fran/tostadas-casa.jpg',
    ing: [
      { f: 'pan-integral', g: 60, t: '2 rebanadas (50-60 g de pan según la guía)' },
      { f: 'huevo', g: 55, t: 'Tostada 1: a la plancha' },
      { f: 'tomate', g: 60, t: 'Rallado, en las dos tostadas' },
      { f: 'cottage', g: 30, t: 'Tostada 1: 2 cdas' },
      { f: 'aceite', g: 5, t: 'Tostada 2: AOVE' },
      { f: 'jamon-serrano', g: 20, t: 'Tostada 2: jamón serrano o 40 g de pavo' },
    ],
    steps: [
      'Tuesta las dos rebanadas y ralla el tomate por encima de las dos.',
      'Tostada 1: huevo a la plancha y queso cottage.',
      'Tostada 2: un hilo de aceite de oliva virgen extra y jamón serrano o pavo.',
    ],
    note: 'Tu desayuno de cada día. Puedes cambiarlo por el desayuno que recomienda el plan.',
  },
  lua: {
    id: 'tostadas-casa',
    name: 'Dos tostadas: huevo con aguacate y jamón',
    meal: ['desayuno'],
    img: '/img/lua/tostadas-casa.jpg',
    ing: [
      { f: 'pan-integral', g: 50, t: '2 rebanadas' },
      { f: 'huevo', g: 55, t: 'Tostada 1: a la plancha' },
      { f: 'aguacate', g: 35, t: 'Tostada 1: ¼ de aguacate' },
      { f: 'aceite', g: 10, t: 'AOVE en las dos tostadas' },
      { f: 'jamon-serrano', g: 20, t: 'Tostada 2: jamón serrano o pavo' },
    ],
    steps: [
      'Tuesta las dos rebanadas y pon un hilo de aceite de oliva virgen extra en las dos.',
      'Tostada 1: huevo a la plancha y aguacate.',
      'Tostada 2: jamón serrano o pavo.',
    ],
    note: 'Tu desayuno de cada día. Puedes cambiarlo por el desayuno que recomienda el plan.',
  },
}

function guideFor(p: PersonId): GuideSection[] {
  const pages: Record<string, number[]> =
    p === 'fran'
      ? { plato: [1], montar: [], grasas: [], equivalencias: [], preentreno: [25, 26] }
      : { plato: [1], montar: [2], grasas: [2], equivalencias: [3], preentreno: [26, 27] }
  return GUIDE.map((s) => ({
    ...s,
    img: s.id === 'plato' ? '/img/fran/guia-plato.jpg' : undefined,
    pages: (pages[s.id] ?? []).map((n) => page(p, n)),
  }))
}

function seed(p: PersonId): PlanDoc {
  const recipes: PlanRecipe[] = RECIPES.filter((r) => !r.only || r.only === p).map((r) => ({
    id: r.id,
    name: r.name,
    meal: r.meal,
    group: r.group,
    yields: r.yields,
    note: r.noteBy?.[p] ?? r.note,
    steps: r.steps,
    ing: r.ing
      .map((i) => ({ f: i.f, g: Array.isArray(i.g) ? i.g[p === 'fran' ? 0 : 1] : i.g, t: i.t }))
      .filter((i) => i.g > 0),
    img: imgOf(p, r.id),
    page: pageOf(p, r.id),
  }))
  const rot = MERIENDA_ROTATION[p]
  return {
    id: `seed-${p}-2026-11`,
    name: p === 'fran' ? 'Plan Noviembre 2.0' : 'Lua Noviembre 2',
    person: p,
    startDate: '2026-11-16',
    createdAt: 0,
    updatedAt: 0,
    source: 'seed',
    weeks: WEEK_MENUS.map((w, wi) => w.map((day, di) => ({ ...day, merienda: [rot[(wi * 7 + di) % rot.length]] }))),
    recipes,
    guide: guideFor(p),
    notes: MENU_NOTES,
    pages: Array.from({ length: M[p].pages }, (_, i) => page(p, i + 1)),
  }
}

export const SEED_PLANS: PlanDoc[] = [seed('fran'), seed('lua')]
