// Solo en desarrollo (npm run dev con ?demo): entra sin sesión y carga datos de ejemplo locales.
// En la versión publicada import.meta.env.DEV es false y todo esto desaparece.
import type { MeasureEntry, WeighIn } from '../data/body'
import { addDays } from './dates'
import { actions, getState } from './store'

export const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

if (DEMO && !getState().people.fran.weighIns.length) {
  const w = (id: string, date: string, v: WeighIn['v']): WeighIn => ({ id, date, v, updatedAt: 1 })
  const m = (id: string, date: string, v: MeasureEntry['v']): MeasureEntry => ({ id, date, v, updatedAt: 1 })
  const fran = [116.4, 115.2, 114.6, 113.5, 112.9, 112.0]
  fran.forEach((kg, i) =>
    actions.saveWeighIn('fran', w(`f${i}`, addDays('2026-10-04', i * 7), { weight: kg, fatPct: 33.2 - i * 0.45, muscleKg: 72.1 + i * 0.1, waterPct: 49.6 + i * 0.25, visceral: 18.5 - i * 0.25, bmr: 2061 - i * 4 })),
  )
  // Captura real del 15/11/2026
  actions.saveWeighIn(
    'fran',
    w('f-real', '2026-11-15', {
      weight: 111.3, bmi: 32.2, fatPct: 30.6, fatKg: 34.1, waterPct: 51.1, muscleKg: 72.8, musclePct: 65.5, skeletalKg: 41.6,
      proteinPct: 13.7, proteinKg: 15.2, boneKg: 4.3, bonePct: 3.9, visceral: 17, bmr: 2038, bodyAge: 32, leanKg: 77.1, whr: 1.0, hr: 67, score: 75,
    }),
  )
  actions.saveMeasure('fran', m('fm1', '2026-10-04', { cuello: 44.5, pecho: 121, biceps: 39, bicepsC: 41.5, cintura: 118, cadera: 117, cuadriceps: 68 }))
  actions.saveMeasure('fran', m('fm2', '2026-10-25', { cuello: 44, pecho: 120, biceps: 38.8, bicepsC: 41.6, cintura: 115.5, cadera: 115.8, cuadriceps: 67.2 }))
  actions.saveMeasure('fran', m('fm3', '2026-11-15', { cuello: 43.5, pecho: 119.5, biceps: 38.6, bicepsC: 41.8, cintura: 113, cadera: 114.5, cuadriceps: 66.8 }))

  const lua = [64.2, 63.9, 63.8, 63.3, 63.1, 62.8, 62.4]
  lua.forEach((kg, i) => actions.saveWeighIn('lua', w(`l${i}`, addDays('2026-10-04', i * 7), { weight: kg, fatPct: 29.4 - i * 0.3, muscleKg: 42.6 + i * 0.05, waterPct: 50.2 + i * 0.2 })))
  actions.saveMeasure('lua', m('lm1', '2026-10-04', { cuello: 32.5, pecho: 92, biceps: 28, bicepsC: 29, cintura: 76, cadera: 101, cuadriceps: 58 }))
  actions.saveMeasure('lua', m('lm2', '2026-11-15', { cuello: 32, pecho: 91.5, biceps: 28.2, bicepsC: 29.4, cintura: 73.5, cadera: 99.5, cuadriceps: 57.4 }))
}
