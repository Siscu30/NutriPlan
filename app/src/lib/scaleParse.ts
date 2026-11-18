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
  visceral: [1, 60], bmr: [700, 4500], bodyAge: [10, 99], leanKg: [15, 160], whr: [0.5, 1.6], hr: [30, 220], score: [1, 100],
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

/** Cuánto nos fiamos de una lectura: con coma > con 3 o más cifras > número corto */
const trust = (key: ScaleKey, x: { n: number; decimal: boolean }) =>
  INTEGER.includes(key) ? 1 : x.decimal ? 2 : String(x.n).length >= 3 ? 1 : 0

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
export function parseScalePages(pages: OcrPage[], today: string, zoom: { weight?: number; date?: string } = {}): ParsedScale {
  const v: Partial<Record<ScaleKey, number>> = {}
  let date = ''
  const set = (k: ScaleKey, x: { n: number; decimal: boolean } | null) => {
    if (!x || v[k] != null) return
    const n = fit(k, x)
    if (n != null) v[k] = n
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
      const pick = row
        .filter((o) => fit(key, valueOf(o)!) != null)
        .sort((a, b) => trust(key, valueOf(b)!) - trust(key, valueOf(a)!))[0]
      if (pick) set(key, valueOf(pick))
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
    }

    // 2) Filas de la cuadrícula: dos números, uno en cada columna
    const byRow: { y: number; left?: Segment; right?: Segment }[] = []
    for (const s of segs) {
      if (!valueOf(s) || labelOf(s)) continue
      const row = byRow.find((r) => Math.abs(r.y - s.y0) < 30)
      if (row) row[s.side] = s
      else byRow.push({ y: s.y0, [s.side]: s })
    }
    for (const r of byRow.sort((a, b) => a.y - b.y)) if (r.left && r.right) gridRows.push([valueOf(r.left), valueOf(r.right)])
  }

  // La cuadrícula empieza en masa muscular (kg) + % de músculo; la fila de justo antes es IMC + % de grasa
  // (tarjeta de puntuación)
  const seen = new Set<string>()
  const rows = gridRows.filter(([a, b]) => {
    const k = `${a?.n}|${b?.n}`
    if (seen.has(k)) return false // filas repetidas al solaparse las capturas
    seen.add(k)
    return true
  })
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
  if (zoom.weight != null) v.weight = zoom.weight
  if (zoom.date) date = zoom.date
  // El peso de Xiaomi siempre lleva un decimal: si no se ha leído, hay que revisarlo
  const check: ScaleKey[] = v.weight != null && Number.isInteger(v.weight) ? ['weight'] : []
  return { date: date || today, v, check }
}
