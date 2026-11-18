// Interpreta el texto leído (OCR) de las capturas de la báscula en Xiaomi Home.
// Diseño de la app: tarjetas con el número arriba y el nombre del dato debajo, en dos columnas.
// Sin dependencias del navegador: se puede probar en Node.
import type { ScaleKey } from '../data/body'

export interface OcrWord {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
}
export interface OcrLine {
  words: OcrWord[]
  x0: number
  y0: number
  x1: number
  y1: number
}
/** Una captura: líneas leídas (de una o varias pasadas) y ancho de la imagen */
export interface OcrPage {
  lines: OcrLine[]
  width: number
}

export interface ParsedScale {
  date: string
  v: Partial<Record<ScaleKey, number>>
  /** Datos leídos con dudas (p. ej. el peso sin decimal): hay que revisarlos */
  check: ScaleKey[]
}

/** Rango razonable de cada dato (para descartar lecturas imposibles) */
const RANGE: Record<ScaleKey, [number, number]> = {
  weight: [25, 300], bmi: [10, 70], fatPct: [3, 70], fatKg: [1, 160], waterPct: [25, 80], muscleKg: [10, 130],
  musclePct: [25, 95], skeletalKg: [5, 90], proteinPct: [4, 30], proteinKg: [2, 40], boneKg: [1, 10], bonePct: [0.5, 10],
  visceral: [1, 60], bmr: [700, 4500], bodyAge: [10, 99], leanKg: [15, 160], whr: [0.5, 1.6], hr: [30, 220], score: [20, 100],
}

/** Nombres de cada dato: todas las palabras deben aparecer; "not" no debe aparecer */
const LABELS: { key: ScaleKey; all: string[]; not?: string[] }[] = [
  { key: 'skeletalKg', all: ['esqueletica'] },
  { key: 'musclePct', all: ['porcentaje', 'musculo'] },
  { key: 'muscleKg', all: ['masa', 'muscular'], not: ['esqueletica'] },
  { key: 'proteinPct', all: ['porcentaje', 'proteinas'] },
  { key: 'proteinKg', all: ['masa', 'proteica'] },
  { key: 'bonePct', all: ['porcentaje', 'mineral'] },
  { key: 'boneKg', all: ['contenido', 'mineral'] },
  { key: 'fatPct', all: ['porcentaje', 'grasa', 'corporal'] },
  { key: 'fatKg', all: ['grasa', 'corporal'], not: ['porcentaje', 'sin', 'peso'] },
  { key: 'waterPct', all: ['agua', 'corporal'], not: ['masa'] },
  { key: 'visceral', all: ['visceral'] },
  { key: 'visceral', all: ['calificacion', 'grasa'] },
  { key: 'bmr', all: ['metabolico', 'basal'] },
  { key: 'bmr', all: ['indice', 'basal'] },
  { key: 'bodyAge', all: ['edad', 'corporal'] },
  { key: 'leanKg', all: ['sin', 'grasa'] },
  { key: 'leanKg', all: ['peso', 'corporal', 'sin'] },
  { key: 'whr', all: ['cintura', 'cadera'] },
  { key: 'whr', all: ['relacion', 'cintura'] },
  { key: 'whr', all: ['estimacion', 'relacion'] },
  { key: 'hr', all: ['frecuencia', 'cardiaca'] },
  { key: 'bmi', all: ['imc'] },
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')

function lev(a: string, b: string) {
  if (a === b) return 0
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
/** ¿La palabra leída se parece a la esperada? (el OCR confunde letras) */
const like = (w: string, target: string) => {
  if (!w) return false
  if (w === target) return true
  if (target === 'imc') return ['im', 'lmc', 'imo', 'inc', 'ime'].includes(w)
  const tol = target.length <= 3 ? 0 : target.length <= 5 ? 1 : target.length <= 8 ? 2 : 3
  return Math.abs(w.length - target.length) <= tol && lev(w, target) <= tol
}

/** Número de una palabra: "72,8", "30,6%", "56,810" (kg leído como dígitos), "2038" */
function numberOf(text: string): { n: number; decimal: boolean } | null {
  const m = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0').match(/(\d{1,4})(?:[.,](\d))?/)
  if (!m) return null
  return { n: m[2] != null ? parseFloat(`${m[1]}.${m[2]}`) : parseInt(m[1], 10), decimal: m[2] != null }
}
const isNumberWord = (t: string) => /^[^\p{L}]*\d/u.test(t) && !/^[+\-−↑↓]/.test(t)

/** Datos que Xiaomi muestra siempre sin decimales */
const INTEGER: ScaleKey[] = ['bmr', 'bodyAge', 'hr', 'score']

/**
 * Ajusta al rango. Si falta la coma ("170", "306", "7717" = "77,1 kg" con la unidad leída como dígitos),
 * prueba a ponerla en cada posición y se queda con la primera lectura que tiene sentido.
 */
function fit(key: ScaleKey, x: { n: number; decimal: boolean }): number | undefined {
  const [lo, hi] = RANGE[key]
  const ok = (n: number) => n >= lo && n <= hi
  if (x.decimal || INTEGER.includes(key)) return ok(x.n) ? x.n : undefined
  if (ok(x.n) && key !== 'whr') return x.n
  const digits = String(x.n)
  for (let k = digits.length - 1; k >= 1; k--) {
    const n = parseFloat(`${digits.slice(0, k)}.${digits[k]}`)
    if (ok(n)) return n
  }
  return undefined
}

type Num = { n: number; decimal: boolean }
/**
 * Elige entre las lecturas de un mismo dato (pasada normal e invertida):
 * - la que trae coma, si la hay;
 * - si una es la otra más cifras sueltas ("73" y "739", con la "g" de kg leída como 9), la corta;
 * - si no, la más larga ("71" frente a "7717" = 77,1 kg).
 */
function choose(key: ScaleKey, xs: Num[]): Num | undefined {
  if (!xs.length) return undefined
  if (INTEGER.includes(key)) return xs[0]
  const dec = xs.find((x) => x.decimal)
  if (dec) return dec
  const ds = xs.map((x) => String(x.n))
  for (let i = 0; i < xs.length; i++) if (ds.some((d, j) => j !== i && d.length > ds[i].length && d.startsWith(ds[i]))) return xs[i]
  return xs.reduce((a, b) => (String(b.n).length > String(a.n).length ? b : a))
}

/** Junta las líneas de varias pasadas y las ordena de arriba abajo */
function mergeLines(lines: OcrLine[]): OcrLine[] {
  return [...lines].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
}

interface Segment {
  words: OcrWord[]
  x0: number
  y0: number
  y1: number
  side: 'left' | 'right'
}

/** Parte cada línea en columnas (izquierda / derecha) */
function segments(lines: OcrLine[], width: number): Segment[] {
  const mid = width / 2
  const out: Segment[] = []
  for (const l of lines) {
    for (const side of ['left', 'right'] as const) {
      const words = l.words.filter((w) => (side === 'left' ? w.x0 < mid : w.x0 >= mid) && w.text.trim())
      if (words.length) out.push({ words, x0: Math.min(...words.map((w) => w.x0)), y0: Math.min(...words.map((w) => w.y0)), y1: Math.max(...words.map((w) => w.y1)), side })
    }
  }
  return out
}

function labelOf(seg: Segment): ScaleKey | null {
  if (isNumberWord(seg.words[0].text)) return null
  const ws = seg.words.map((w) => norm(w.text)).filter(Boolean)
  for (const l of LABELS) {
    if (!l.all.every((t) => ws.some((w) => like(w, t)))) continue
    if (l.not?.some((t) => ws.some((w) => like(w, t)))) continue
    return l.key
  }
  return null
}

/** Primer número del segmento (el valor; los cambios con flecha van detrás) */
function valueOf(seg: Segment) {
  const w = seg.words.find((x) => isNumberWord(x.text))
  return w ? numberOf(w.text) : null
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Peso: el número más grande de la pantalla ("110" + ",8" pequeño al lado) */
export function weightOf(lines: OcrLine[]): { n?: number; h: number; box: Box; intPart: string } | null {
  let best: { line: OcrLine; h: number } | null = null
  for (const l of lines) {
    const nums = l.words.filter((w) => /\d/.test(w.text))
    if (!nums.length) continue
    const h = Math.max(...nums.map((w) => w.y1 - w.y0))
    if (!best || h > best.h) best = { line: l, h }
  }
  if (!best || best.h < 40) return null
  const big = best.line.words.filter((w) => /\d/.test(w.text) && w.y1 - w.y0 > best!.h * 0.6)
  const intPart = big.map((w) => w.text.replace(/\D/g, '')).join('')
  const x0 = Math.min(...big.map((w) => w.x0))
  const right = Math.max(...big.map((w) => w.x1))
  const top = Math.min(...big.map((w) => w.y0))
  const bottom = Math.max(...big.map((w) => w.y1))
  const box = { x0, y0: top, x1: right + best.h * 1.6, y1: bottom }
  // A la derecha va "kg" arriba y ",8" abajo; el OCR suele leer la coma como "1": se coge el último dígito
  const small = lines
    .flatMap((l) => l.words)
    .filter((w) => w.x0 >= right - 5 && w.x0 < right + best!.h * 2 && w.y0 >= top - 10 && w.y1 <= bottom + best!.h && /\d/.test(w.text) && w.y1 - w.y0 < best!.h * 0.75)
    .sort((a, b) => a.x0 - b.x0)
    .map((w) => w.text.replace(/\D/g, ''))
    .join('')
  const direct = numberOf(big.map((w) => w.text).join(''))
  if (direct?.decimal) return { n: fit('weight', direct), h: best.h, box, intPart }
  const n = fit('weight', { n: parseFloat(`${intPart}${small ? `.${small.slice(-1)}` : ''}`), decimal: true })
  return { n, h: best.h, box, intPart }
}

/** Lectura "con lupa" de la zona del peso (solo dígitos): "1108" → 110,8 si encaja con la parte entera */
export function weightFromZoom(text: string, intPart: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, '')
  if (!intPart || !digits.startsWith(intPart) || digits.length <= intPart.length) return undefined
  return fit('weight', { n: parseFloat(`${intPart}.${digits[intPart.length]}`), decimal: true })
}

/** Fecha en un texto: "08/11/2026" (si el año se lee mal, se usa el actual) */
export function dateIn(text: string, today: string): string {
  const m = text.match(DATE)
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) return ''
  const md = `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const y = +m[3]
  const year = +today.slice(0, 4)
  let d = y >= 2020 && y <= year ? `${y}-${md}` : `${year}-${md}`
  if (d > today) d = `${year - 1}-${md}`
  return d
}

const DATE = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/

/** Interpreta todas las capturas de un pesaje y une sus datos */
export function parseScalePages(pages: OcrPage[], today: string, zoom: { weights?: number[]; date?: string } = {}): ParsedScale {
  const v: Partial<Record<ScaleKey, number>> = {}
  let date = ''
  // Todas las lecturas posibles de cada dato (para elegir luego la que cuadra con el resto)
  const alts: Partial<Record<ScaleKey, number[]>> = {}
  const intOnly = new Set<ScaleKey>() // leído sin decimal en un dato que Xiaomi siempre muestra con decimal
  const alt = (k: ScaleKey, x: Num | null) => {
    if (!x) return
    for (const n of fitAll(k, x)) if (!(alts[k] ??= []).includes(n)) alts[k]!.push(n)
  }
  const set = (k: ScaleKey, x: Num | null) => {
    alt(k, x)
    if (!x || v[k] != null) return
    const n = fit(k, x)
    if (n == null) return
    v[k] = n
    if (ALWAYS_DECIMAL.includes(k) && !x.decimal && String(x.n).length <= 2) intOnly.add(k)
  }

  // Fallback por orden: la cuadrícula de tarjetas de Xiaomi Home, fila a fila
  const GRID: [ScaleKey, ScaleKey][] = [
    ['muscleKg', 'musclePct'],
    ['waterPct', 'proteinPct'],
    ['bonePct', 'skeletalKg'],
    ['visceral', 'bmr'],
    ['whr', 'bodyAge'],
    ['leanKg', 'hr'],
  ]
  const gridRows: [ReturnType<typeof valueOf>, ReturnType<typeof valueOf>][] = []
  let bestWeightH = 0
  let bestWeightN: number | undefined
  const waterKg: number[] = [] // "Masa de agua corporal" (kg): no se guarda, pero sirve para comprobar el % de agua

  for (const page of pages) {
    const lines = mergeLines(page.lines)
    const text = lines.map((l) => l.words.map((w) => w.text).join(' ')).join('\n')
    if (!date) date = dateIn(text, today)
    // El peso es el número más grande de todas las capturas (no de la primera)
    const w = weightOf(lines)
    if (w?.n != null && w.h > bestWeightH) {
      bestWeightH = w.h
      v.weight = w.n
    }
    if (w?.n != null && w.h >= bestWeightH) bestWeightN = w.n
    // Puntuación: "75 Puntos"
    for (const l of lines) {
      const i = l.words.findIndex((w) => like(norm(w.text), 'puntos'))
      if (i > 0) set('score', numberOf(l.words[i - 1].text))
    }

    const segs = segments(lines, page.width)
    // 1) Por nombre: el valor es el número más cercano por encima, en la misma columna
    for (const s of segs) {
      const key = labelOf(s)
      if (!key) continue
      const h = Math.max(20, s.y1 - s.y0)
      const cands = segs
        .filter((o) => o.side === s.side && o.y1 <= s.y0 + h * 0.5 && s.y0 - o.y1 < h * 5 && Math.abs(o.x0 - s.x0) < page.width * 0.15 && valueOf(o))
        .sort((a, b) => b.y1 - a.y1)
      // Entre las lecturas de la misma fila (dos pasadas), la que trae decimal y cabe en el rango
      const row = cands.filter((o) => cands[0] && Math.abs(o.y1 - cands[0].y1) < h * 1.5)
      const xs = row.map((o) => valueOf(o)!).filter((x) => fit(key, x) != null)
      const pick = choose(key, xs)
      if (pick) set(key, pick)
      for (const x of xs) alt(key, x)
    }

    // 1b) "Composición corporal": columna derecha con agua (kg), grasa, mineral óseo y masa proteica, en ese orden
    const head = lines.find((l) => l.words.some((w) => lev(norm(w.text), 'composicion') <= 1) && l.words.some((w) => norm(w.text).startsWith('corpora')))
    if (head) {
      const vals: { y: number; x: ReturnType<typeof valueOf> }[] = []
      for (const sg of segs) {
        if (sg.side !== 'right' || sg.y0 <= head.y1 || labelOf(sg)) continue
        const x = valueOf(sg)
        if (!x) continue
        const same = vals.find((p) => Math.abs(p.y - sg.y0) < 40)
        if (same) {
          if (!same.x?.decimal && x.decimal) same.x = x
        } else vals.push({ y: sg.y0, x })
      }
      vals.sort((a, b) => a.y - b.y)
      // Termina donde empieza la cuadrícula (primera fila con número también a la izquierda)
      const firstPair = segs.find((sg) => sg.side === 'left' && sg.y0 > head.y1 && valueOf(sg))
      const comp = vals.filter((p) => !firstPair || p.y < firstPair.y0 - 20).slice(0, 4)
      if (comp.length === 4) {
        set('fatKg', comp[1].x)
        set('boneKg', comp[2].x)
        set('proteinKg', comp[3].x)
      }
      // Si el orden falla (una línea perdida o de más), las relaciones con el peso eligen después
      for (const p of comp) for (const k of ['fatKg', 'boneKg', 'proteinKg'] as const) alt(k, p.x)
      for (const p of comp) if (p.x) for (const n of fitAll('leanKg', p.x)) waterKg.push(n)
    }

    // 2) Filas de la cuadrícula: dos números, uno en cada columna
    const byRow: { y: number; left?: Segment; right?: Segment }[] = []
    for (const s of segs) {
      if (!valueOf(s) || labelOf(s)) continue
      const row = byRow.find((r) => Math.abs(r.y - s.y0) < 30)
      if (row) row[s.side] = s
      else byRow.push({ y: s.y0, [s.side]: s })
    }
    const pairs = byRow.sort((a, b) => a.y - b.y).filter((r) => r.left && r.right)
    for (const r of pairs) gridRows.push([valueOf(r.left!), valueOf(r.right!)])

    // IMC y % de grasa: la primera fila de dos números debajo de "Puntos" (tarjeta de puntuación)
    const pts = lines.find((l) => l.words.some((w) => like(norm(w.text), 'puntos')))
    if (pts) {
      const r = pairs.find((p) => p.y > pts.y1)
      const a = r && valueOf(r.left!)
      const b = r && valueOf(r.right!)
      if (a && b && fit('bmi', a) != null && fit('fatPct', b) != null && (fit('fatPct', b) ?? 0) < 45) {
        set('bmi', a)
        set('fatPct', b)
      }
    }
  }

  // La cuadrícula empieza en masa muscular (kg) + % de músculo; la fila de justo antes es IMC + % de grasa
  // (tarjeta de puntuación)
  // Filas repetidas al solaparse las capturas (o cortadas por el borde, como "739" por "73 kg"):
  // si coinciden, se quedan como una sola con la mejor lectura de cada lado
  const digits = (x: Num) => String(x.n).replace('.', '')
  const compatible = (x: Num | null, y: Num | null) => !!x && !!y && (digits(x).startsWith(digits(y)) || digits(y).startsWith(digits(x)))
  const rows: [Num | null, Num | null][] = []
  for (const [a, b] of gridRows) {
    const same = rows.find(([c, d]) => compatible(a, c) && compatible(b, d))
    if (!same) rows.push([a, b])
    else {
      same[0] = choose('muscleKg', [same[0]!, a!].filter(Boolean)) ?? same[0]
      same[1] = choose('musclePct', [same[1]!, b!].filter(Boolean)) ?? same[1]
    }
  }
  // El % de músculo de Xiaomi ronda el 60-75 %; así no se confunde con la fila IMC / % grasa
  const start = rows.findIndex(([a, b]) => a && b && fit('muscleKg', a) != null && (fit('musclePct', b) ?? 0) >= 45)
  if (start > 0) {
    const [a, b] = rows[start - 1]
    if (a && b && fit('bmi', a) != null && fit('fatPct', b) != null) {
      set('bmi', a)
      set('fatPct', b)
    }
  }
  if (start >= 0) GRID.forEach(([l, r], i) => {
    const row = rows[start + i]
    if (!row) return
    set(l, row[0])
    set(r, row[1])
  })

  // Lo leído "con lupa" manda sobre la lectura general
  alts.weight = [...new Set([...(zoom.weights ?? []), ...(bestWeightN != null ? [bestWeightN] : [])])]
  if (alts.weight.length) v.weight = alts.weight[0]
  if (zoom.date) date = zoom.date

  const check = new Set<ScaleKey>(reconcile(v, alts, waterKg))
  // Músculo esquelético: entre el 40 % y el 70 % de la masa muscular
  if (v.skeletalKg != null && v.muscleKg != null && (v.skeletalKg < v.muscleKg * 0.4 || v.skeletalKg > v.muscleKg * 0.7)) {
    const ok = (alts.skeletalKg ?? []).find((x) => x >= v.muscleKg! * 0.4 && x <= v.muscleKg! * 0.7)
    if (ok != null) v.skeletalKg = ok
    else delete v.skeletalKg
  }
  for (const k of intOnly) if (v[k] != null && Number.isInteger(v[k])) check.add(k)
  // El peso de Xiaomi siempre lleva un decimal: si no se ha leído, hay que revisarlo
  if (v.weight != null && Number.isInteger(v.weight)) check.add('weight')
  return { date: date || today, v, check: [...check] }
}

/** Datos que Xiaomi muestra siempre con un decimal ("32,6", "65,1 %", "18,0") */
const ALWAYS_DECIMAL: ScaleKey[] = ['bmi', 'fatPct', 'waterPct', 'musclePct', 'proteinPct', 'bonePct', 'visceral', 'whr']

/** Todas las lecturas razonables de un número: tal cual y con la coma en cada posición */
function fitAll(key: ScaleKey, x: Num): number[] {
  const [lo, hi] = RANGE[key]
  const ok = (n: number) => n >= lo && n <= hi
  const out: number[] = []
  if (ok(x.n)) out.push(x.n)
  if (!x.decimal && !INTEGER.includes(key)) {
    const d = String(x.n)
    for (let k = d.length - 1; k >= 1; k--) {
      const n = parseFloat(`${d.slice(0, k)}.${d[k]}`)
      if (ok(n) && !out.includes(n)) out.push(n)
    }
  }
  return out
}

/** Parejas que Xiaomi calcula a partir del peso: kg = peso × % / 100 */
const PAIRS: [ScaleKey, ScaleKey][] = [
  ['fatKg', 'fatPct'],
  ['muscleKg', 'musclePct'],
  ['proteinKg', 'proteinPct'],
  ['boneKg', 'bonePct'],
]
const tolKg = (expected: number) => Math.max(0.16, expected * 0.002)
const TOL_LEAN = 0.15

/**
 * Elige, entre las lecturas de cada dato, las que cuadran entre sí:
 * kg = peso × % / 100 (grasa, músculo, proteína, mineral) y peso sin grasa = peso − grasa.
 * Nunca calcula un valor: solo escoge entre lo leído. Si nada cuadra y el peso es fiable, deja el kg vacío.
 * Devuelve los datos que conviene revisar.
 */
function reconcile(v: Partial<Record<ScaleKey, number>>, alts: Partial<Record<ScaleKey, number[]>>, waterKg: number[]): ScaleKey[] {
  const c = (k: ScaleKey) => [...new Set([...(v[k] != null ? [v[k]!] : []), ...(alts[k] ?? [])])]
  const bestPair = (W: number, kg: ScaleKey, pct: ScaleKey) => {
    let best: { kg: number; pct: number; err: number } | null = null
    for (const p of c(pct))
      for (const k of c(kg)) {
        const err = Math.abs(k - (W * p) / 100)
        if (err <= tolKg((W * p) / 100) && (!best || err < best.err)) best = { kg: k, pct: p, err }
      }
    return best
  }
  const bestLean = (W: number) => {
    let best: { lean: number; fat: number; err: number } | null = null
    for (const f of c('fatKg'))
      for (const l of c('leanKg')) {
        const err = Math.abs(l + f - W)
        if (err <= TOL_LEAN && (!best || err < best.err)) best = { lean: l, fat: f, err }
      }
    return best
  }
  // Peso: el que más relaciones cumple (a igualdad, el leído con lupa o el principal).
  // Un peso menor que el peso sin grasa o la masa muscular es imposible (p. ej. el 50,6 del agua de otra captura).
  const floor = Math.max(v.leanKg ?? 0, v.muscleKg ?? 0)
  const ws = c('weight').filter((w) => w > floor)
  const flags: ScaleKey[] = []
  // También se prueba la suma de grasa + peso sin grasa leídas (el decimal pequeño del peso se lee mal)
  const sums: number[] = []
  for (const f of c('fatKg')) for (const l of c('leanKg')) sums.push(Math.round((f + l) * 10) / 10)
  if (ws.length) {
    for (const sum of sums) if (Math.abs(sum - ws[0]) < 1 && !ws.includes(sum)) ws.push(sum)
  } else {
    // Sin peso legible: solo si grasa + peso sin grasa lo dan, y marcado para revisar
    if (!sums.length) {
      delete v.weight
      return v.weight == null && c('weight').length ? ['weight'] : []
    }
    ws.push(...new Set(sums))
    flags.push('weight')
  }
  const bestWater = (W: number) => {
    let best: { pct: number; err: number } | null = null
    for (const p of c('waterPct'))
      for (const k of waterKg) {
        const err = Math.abs(k - (W * p) / 100)
        if (err <= tolKg((W * p) / 100) && (!best || err < best.err)) best = { pct: p, err }
      }
    return best
  }
  const score = (W: number) => PAIRS.filter(([k, p]) => bestPair(W, k, p)).length + (bestLean(W) ? 1 : 0) + (bestWater(W) ? 1 : 0)
  let W = ws[0]
  for (const w of ws) if (score(w) > score(W)) W = w
  const confirmed = score(W) >= 2
  v.weight = W

  for (const [kg, pct] of PAIRS) {
    const b = bestPair(W, kg, pct)
    if (b) {
      v[kg] = b.kg
      v[pct] = b.pct
    } else if (confirmed && v[kg] != null && v[pct] != null) delete v[kg] // no cuadra: mejor vacío que equivocado
  }
  const wa = bestWater(W)
  if (wa) v.waterPct = wa.pct
  const l = bestLean(W)
  if (l) {
    v.leanKg = l.lean
    if (!bestPair(W, 'fatKg', 'fatPct')) v.fatKg = l.fat
  } else if (confirmed && v.leanKg != null && v.fatKg != null) delete v.leanKg

  // Peso que no cuadra con nada pudiendo comprobarse: a revisar
  const checkable = PAIRS.some(([k, p]) => c(k).length > 0 && c(p).length > 0) || (c('leanKg').length > 0 && c('fatKg').length > 0)
  if (checkable && score(W) === 0) flags.push('weight')
  return flags
}

