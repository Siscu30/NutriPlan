// Pesajes de la báscula y medidas con cinta: qué se guarda y cómo se interpreta.

export type ScaleKey =
  | 'weight'
  | 'bmi'
  | 'fatPct'
  | 'fatKg'
  | 'waterPct'
  | 'muscleKg'
  | 'musclePct'
  | 'skeletalKg'
  | 'proteinPct'
  | 'proteinKg'
  | 'boneKg'
  | 'bonePct'
  | 'visceral'
  | 'bmr'
  | 'bodyAge'
  | 'leanKg'
  | 'whr'
  | 'hr'
  | 'score'

export type MeasureKey = 'cuello' | 'pecho' | 'biceps' | 'bicepsC' | 'cintura' | 'cadera' | 'cuadriceps'

/** Hacia dónde es bueno que vaya el valor */
export type Good = 'down' | 'up' | 'neutral'

export interface MetricMeta<K extends string> {
  key: K
  label: string
  unit: string
  decimals: number
  good: Good
}

export const SCALE: MetricMeta<ScaleKey>[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', decimals: 1, good: 'down' },
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1, good: 'down' },
  { key: 'fatPct', label: 'Grasa corporal', unit: '%', decimals: 1, good: 'down' },
  { key: 'fatKg', label: 'Grasa', unit: 'kg', decimals: 1, good: 'down' },
  { key: 'visceral', label: 'Grasa visceral', unit: '', decimals: 1, good: 'down' },
  { key: 'muscleKg', label: 'Masa muscular', unit: 'kg', decimals: 1, good: 'up' },
  { key: 'musclePct', label: 'Músculo', unit: '%', decimals: 1, good: 'up' },
  { key: 'skeletalKg', label: 'Músculo esquelético', unit: 'kg', decimals: 1, good: 'up' },
  { key: 'waterPct', label: 'Agua corporal', unit: '%', decimals: 1, good: 'up' },
  { key: 'proteinPct', label: 'Proteínas', unit: '%', decimals: 1, good: 'up' },
  { key: 'proteinKg', label: 'Masa proteica', unit: 'kg', decimals: 1, good: 'up' },
  { key: 'boneKg', label: 'Mineral óseo', unit: 'kg', decimals: 1, good: 'neutral' },
  { key: 'bonePct', label: 'Mineral óseo', unit: '%', decimals: 1, good: 'neutral' },
  { key: 'leanKg', label: 'Peso sin grasa', unit: 'kg', decimals: 1, good: 'neutral' },
  { key: 'bmr', label: 'Metabolismo basal', unit: 'kcal', decimals: 0, good: 'neutral' },
  { key: 'bodyAge', label: 'Edad corporal', unit: 'años', decimals: 0, good: 'down' },
  { key: 'whr', label: 'Cintura-cadera', unit: '', decimals: 2, good: 'down' },
  { key: 'hr', label: 'Frecuencia cardiaca', unit: 'lpm', decimals: 0, good: 'neutral' },
  { key: 'score', label: 'Puntuación', unit: 'pts', decimals: 0, good: 'up' },
]

export interface MeasureMeta extends MetricMeta<MeasureKey> {
  short: string
  /** Dónde y cómo medir, en frases cortas */
  how: string[]
}

export const MEASURES: MeasureMeta[] = [
  {
    key: 'cuello',
    label: 'Cuello',
    short: 'Cuello',
    unit: 'cm',
    decimals: 1,
    good: 'down',
    how: ['Justo por debajo de la nuez.', 'Mirando al frente, con los hombros relajados.', 'Cinta un poco inclinada hacia delante, sin apretar.'],
  },
  {
    key: 'pecho',
    label: 'Pecho',
    short: 'Pecho',
    unit: 'cm',
    decimals: 1,
    good: 'neutral',
    how: ['A la altura de los pezones.', 'La cinta pasa por debajo de las axilas y por los omóplatos, recta.', 'Brazos relajados; mide al soltar el aire.'],
  },
  {
    key: 'biceps',
    label: 'Bíceps relajado',
    short: 'Bíceps',
    unit: 'cm',
    decimals: 1,
    good: 'neutral',
    how: ['Brazo derecho colgando, relajado.', 'En el punto medio entre el hombro y el codo.', 'Cinta perpendicular al brazo.'],
  },
  {
    key: 'bicepsC',
    label: 'Bíceps contraído',
    short: 'Bíceps cont.',
    unit: 'cm',
    decimals: 1,
    good: 'up',
    how: ['Brazo derecho levantado a la altura del hombro, codo a 90°.', 'Puño cerrado y bíceps apretado.', 'En la parte más ancha del bíceps.'],
  },
  {
    key: 'cintura',
    label: 'Cintura',
    short: 'Cintura',
    unit: 'cm',
    decimals: 1,
    good: 'down',
    how: ['A la altura del ombligo.', 'De pie, con la tripa relajada (sin meterla).', 'Mide al final de soltar el aire, cinta paralela al suelo.'],
  },
  {
    key: 'cadera',
    label: 'Cadera',
    short: 'Cadera',
    unit: 'cm',
    decimals: 1,
    good: 'down',
    how: ['En la parte más ancha de los glúteos.', 'Pies juntos y peso repartido.', 'Cinta paralela al suelo; mírala en el espejo.'],
  },
  {
    key: 'cuadriceps',
    label: 'Cuádriceps',
    short: 'Muslo',
    unit: 'cm',
    decimals: 1,
    good: 'neutral',
    how: ['Muslo derecho.', 'A medio camino entre el pliegue de la ingle y la parte de arriba de la rodilla.', 'De pie, pierna relajada y peso en las dos piernas.'],
  },
]

export const MEASURE_TIPS = [
  'Mide siempre a la misma hora, mejor por la mañana en ayunas.',
  'Usa una cinta flexible: ajustada a la piel, sin hundirla.',
  'Toma cada medida dos veces y apunta la media.',
]

export interface WeighIn {
  id: string
  date: string
  /** Primera captura de la báscula ("sb:body/<persona>/<id>.jpg") */
  photo?: string
  /** Todas las capturas del pesaje */
  photos?: string[]
  v: Partial<Record<ScaleKey, number>>
  updatedAt: number
  deleted?: boolean
}

/** Capturas de un pesaje (los antiguos solo tienen "photo") */
export const photosOf = (w?: Pick<WeighIn, 'photo' | 'photos'> | null): string[] => w?.photos ?? (w?.photo ? [w.photo] : [])

export interface MeasureEntry {
  id: string
  date: string
  v: Partial<Record<MeasureKey, number>>
  updatedAt: number
  deleted?: boolean
}

/** Une dos listas por id quedándose con la versión más reciente de cada entrada */
export function mergeById<T extends { id: string; date: string; updatedAt: number }>(a: T[], b: T[]): T[] {
  const m = new Map<string, T>()
  for (const x of [...a, ...b]) {
    const cur = m.get(x.id)
    if (!cur || x.updatedAt > cur.updatedAt) m.set(x.id, x)
  }
  return [...m.values()].sort((x, y) => x.date.localeCompare(y.date) || x.updatedAt - y.updatedAt)
}

export const live = <T extends { deleted?: boolean }>(list: T[]) => list.filter((x) => !x.deleted)

export function fmt(v: number | undefined, decimals: number) {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Valor con signo: +0,4 / −1,2 */
export function fmtDelta(d: number, decimals: number) {
  d = round(d, decimals)
  const s = Math.abs(d).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return d > 0 ? `+${s}` : d < 0 ? `−${s}` : s
}

/** Tono del cambio: bueno, malo o neutro */
export const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals

export function tone(d: number, good: Good, decimals = 1): 'good' | 'bad' | 'flat' {
  d = round(d, decimals)
  if (Math.abs(d) < 1e-9 || good === 'neutral') return 'flat'
  return (d < 0) === (good === 'down') ? 'good' : 'bad'
}
