// Lee las capturas de la báscula en el propio dispositivo (OCR con Tesseract, gratis y sin enviar las imágenes a nadie).
// La primera vez descarga el lector y el idioma español (unos pocos MB); después quedan guardados.
import type { Worker } from 'tesseract.js'
import { today } from './dates'
import { dateIn, parseScalePages, weightFromZoom, weightOf, type Box, type OcrLine, type OcrPage, type OcrWord, type ParsedScale } from './scaleParse'

/** Ancho al que se normalizan las capturas antes de leerlas */
const OCR_WIDTH = 1290

export type OcrProgress = { stage: 'loading' | 'reading'; pct: number; index?: number; total?: number }

let worker: Promise<Worker> | null = null
let onLoad: ((pct: number) => void) | null = null

function getWorker() {
  if (!worker) {
    worker = import('tesseract.js').then(({ createWorker }) =>
      createWorker('spa', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status !== 'recognizing text') onLoad?.(m.progress)
        },
      }),
    )
    worker.catch(() => (worker = null))
  }
  return worker
}

/** Ancho de cada lectura: la primera a tamaño original (si es de móvil); la segunda, a otra escala */
function widthFor(original: number, attempt: 0 | 1) {
  const native = original >= 900 && original <= 1600 ? original : OCR_WIDTH
  if (attempt === 0) return native
  return Math.abs(native - OCR_WIDTH) > 60 ? OCR_WIDTH : 1100
}

/** Escala la captura y devuelve dos versiones: original y gris invertido (texto oscuro sobre claro) */
async function variants(blob: Blob, attempt: 0 | 1): Promise<{ canvases: HTMLCanvasElement[]; width: number; original: number }> {
  const bmp = await createImageBitmap(blob)
  const original = bmp.width
  const scale = widthFor(original, attempt) / original
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const make = (invert: boolean) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    // Pasada 1: la imagen tal cual. Pasada 2: gris invertido (Tesseract lee mejor texto oscuro sobre claro)
    if (invert) ctx.filter = 'grayscale(1) invert(1)'
    ctx.drawImage(bmp, 0, 0, w, h)
    return c
  }
  const out = { canvases: [make(false), make(true)], width: w, original }
  bmp.close()
  return out
}

/** Una lectura completa de todas las capturas a una escala */
async function readAt(w: Worker, images: Blob[], attempt: 0 | 1, onStep: (i: number) => void) {
  const pages: OcrPage[] = []
  const sources: HTMLCanvasElement[] = []
  for (let i = 0; i < images.length; i++) {
    onStep(i)
    const { canvases, width } = await variants(images[i], attempt)
    const lines: OcrLine[] = []
    for (const c of canvases) {
      const { data } = await w.recognize(c, {}, { blocks: true })
      for (const b of data.blocks ?? [])
        for (const p of b.paragraphs)
          for (const l of p.lines) lines.push({ ...l.bbox, words: l.words.map((x) => ({ text: x.text, ...x.bbox })) })
    }
    // La lupa de números solo en la primera lectura (en la segunda se busca otra versión de los datos)
    if (attempt === 0) await refineNumbers(w, lines, canvases[0])
    pages.push({ lines, width })
    sources.push(canvases[0])
  }
  return { pages, zoom: await zoomReads(w, pages, sources) }
}

/**
 * Relee "con lupa" cada número de la pantalla: recortado, ampliado, en blanco y negro y solo con dígitos y coma.
 * Así no se cuelan la "g" de kg como un 9 ni se pierde la coma de "50,6".
 * El número grande del peso tiene su propia lupa.
 */
async function refineNumbers(w: Worker, lines: OcrLine[], src: HTMLCanvasElement) {
  // Solo los números que se usan: el primero de cada columna en cada línea (no flechas de cambio ni ejes)
  const mid = src.width / 2
  const words: OcrWord[] = []
  for (const l of lines)
    for (const left of [true, false]) {
      const first = l.words.find((x) => (left ? x.x0 < mid : x.x0 >= mid) && x.text.trim())
      const wd = first ? first.x1 - first.x0 : 0
      // Con forma de número: ni diminuto ni un bloque grande (gráficas, tarjetas enteras)
      if (first && /^[^\p{L}+\-−↑↓]*\d/u.test(first.text) && wd >= 10 && wd < src.width * 0.3 && first.y1 - first.y0 < src.width * 0.08) words.push(first)
    }
  words.splice(40)
  if (!words.length) return
  const heights = words.map((x) => x.y1 - x.y0).sort((a, b) => a - b)
  const median = heights[Math.floor(heights.length / 2)]
  const done: { box: OcrWord; text: string | null }[] = []
  const overlap = (a: OcrWord, b: OcrWord) => {
    const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0))
    const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
    return (ix * iy) / Math.max(1, Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)))
  }
  try {
    await w.setParameters({ tessedit_char_whitelist: '0123456789,', tessedit_pageseg_mode: '7' as never })
    const deadline = performance.now() + 1500 // como mucho 1,5 s por captura
    for (const word of words) {
      if (performance.now() > deadline) break
      const h = word.y1 - word.y0
      if (h < 12 || h > median * 2.2) continue // muy pequeño o el peso grande
      if ((word.x1 - word.x0) / h > 5) continue // no tiene forma de número
      const prev = done.find((d) => overlap(d.box, word) > 0.6) // la misma cifra leída en la otra pasada
      let text = prev?.text
      if (prev === undefined) {
        const pad = h * 0.18
        const c = crop(src, { x0: word.x0 - pad, y0: word.y0 - pad, x1: word.x1 + pad, y1: word.y1 + pad }, Math.min(4, 64 / h))
        const t = (await w.recognize(c)).data.text.trim()
        text = /^\d{1,4}(,\d{1,2})?$/.test(t) ? t : null
        done.push({ box: word, text })
      }
      // Solo se sustituye si la lectura con lupa es un número limpio y empieza igual (no se cambia de cifra)
      const lead = word.text.match(/\d/)?.[0]
      if (text && (!lead || text[0] === lead || word.text.replace(/\D/g, '').startsWith(text.replace(/\D/g, '').slice(0, 1)))) {
        const unit = word.text.match(/%$/) ? '%' : ''
        word.text = text + unit
      }
    }
  } catch {
    /* sin lupa: vale la lectura general */
  } finally {
    await w.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '6' as never })
  }
}

/** Pasa las líneas de una lectura a la escala de otra (misma captura, distinto tamaño) */
function rescale(page: OcrPage, toWidth: number): OcrPage {
  const k = toWidth / page.width
  const box = <T extends { x0: number; y0: number; x1: number; y1: number }>(b: T): T => ({ ...b, x0: b.x0 * k, y0: b.y0 * k, x1: b.x1 * k, y1: b.y1 * k })
  return { width: toWidth, lines: page.lines.map((l) => ({ ...box(l), words: l.words.map(box) })) }
}

const COMPLETE = 19

/**
 * Lee una o varias capturas y une sus datos en un solo pesaje.
 * Si en la primera lectura falta algo o hay dudas, hace una segunda a otra escala y junta las dos:
 * el lector elige entre todas las lecturas las que cuadran entre sí.
 */
export async function readScaleScreens(images: Blob[], onProgress: (p: OcrProgress) => void): Promise<ParsedScale> {
  onLoad = (pct) => onProgress({ stage: 'loading', pct })
  onProgress({ stage: 'loading', pct: 0 })
  const w = await getWorker()
  const n = images.length
  const first = await readAt(w, images, 0, (i) => onProgress({ stage: 'reading', pct: i / (n * 2), index: i + 1, total: n }))
  const r1 = parseScalePages(first.pages, today(), first.zoom)
  // Segunda lectura solo si merece la pena: faltan 2 o más datos o el peso es dudoso
  if (COMPLETE - Object.keys(r1.v).length < 2 && !r1.check.includes('weight')) {
    onProgress({ stage: 'reading', pct: 1, index: n, total: n })
    return r1
  }
  const second = await readAt(w, images, 1, (i) => onProgress({ stage: 'reading', pct: 0.5 + i / (n * 2), index: i + 1, total: n }))
  const pages = first.pages.map((p, i) => ({ width: p.width, lines: [...p.lines, ...rescale(second.pages[i], p.width).lines] }))
  const zoom = { weights: [...first.zoom.weights, ...second.zoom.weights], date: first.zoom.date || second.zoom.date }
  onProgress({ stage: 'reading', pct: 1, index: n, total: n })
  return parseScalePages(pages, today(), zoom)
}

/**
 * Recorta una zona, la amplía y la deja en negro sobre blanco.
 * Detecta sola si el fondo es claro u oscuro (modo claro u oscuro de Xiaomi Home).
 */
function crop(src: HTMLCanvasElement, b: Box, scale: number, binarize = false) {
  const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0))
  const w = Math.min(src.width, Math.ceil(b.x1)) - x0, h = Math.min(src.height, Math.ceil(b.y1)) - y0
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, x0, y0, w, h, 0, 0, c.width, c.height)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const lum = (i: number) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]
  // El color más frecuente (mediana) es el fondo
  const hist = new Array(256).fill(0)
  for (let i = 0; i < d.length; i += 4) hist[Math.round(lum(i))]++
  let acc = 0
  let bg = 0
  for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= d.length / 8) { bg = v; break }
  const light = bg > 128
  for (let i = 0; i < d.length; i += 4) {
    const l = lum(i)
    let out: number
    if (binarize) {
      // Texto tenue: lo que se separa del fondo (más oscuro en modo claro, más claro en modo oscuro) pasa a negro
      out = (light ? l < bg - 28 : l > bg + 28) ? 0 : 255
    } else {
      const g = light ? l : 255 - l
      out = Math.max(0, Math.min(255, (g - 128) * 1.6 + 128))
    }
    d[i] = d[i + 1] = d[i + 2] = out
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * Lectura "con lupa" del peso y de la fecha: solo dígitos, en la zona ampliada.
 * El decimal pequeño del peso (",8") y la fecha gris clara se leen mal en la pasada general.
 */
async function zoomReads(w: Worker, pages: OcrPage[], sources: HTMLCanvasElement[]): Promise<{ weights: number[]; date?: string }> {
  let best: { i: number; r: NonNullable<ReturnType<typeof weightOf>> } | null = null
  pages.forEach((p, i) => {
    const r = weightOf(p.lines)
    if (r && (!best || r.h > best.r.h)) best = { i, r }
  })
  if (!best) return { weights: [] }
  const { i, r } = best as { i: number; r: NonNullable<ReturnType<typeof weightOf>> }
  const src = sources[i]
  const out: { weights: number[]; date?: string } = { weights: [] }
  try {
    await w.setParameters({ tessedit_char_whitelist: '0123456789,', tessedit_pageseg_mode: '7' as never })
    const pad = r.h * 0.15
    const wz = await w.recognize(crop(src, { x0: r.box.x0 - pad, y0: r.box.y0 - pad, x1: r.box.x1 + pad, y1: r.box.y1 + pad }, 1))
    const zw = weightFromZoom(wz.data.text, r.intPart)
    if (zw != null) out.weights.push(zw)
    // La fecha está entre el título y el peso, en gris claro
    await w.setParameters({ tessedit_char_whitelist: '0123456789/: ', tessedit_pageseg_mode: '6' as never })
    const dz = await w.recognize(crop(src, { x0: 0, y0: r.box.y0 - r.h * 2.8, x1: src.width, y1: r.box.y0 - r.h * 0.3 }, 2, true))
    out.date = dateIn(dz.data.text, today()) || undefined
  } catch {
    /* sin lupa: vale la lectura general */
  } finally {
    // Valores por defecto de tesseract.js (modo "bloque")
    await w.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '6' as never })
  }
  return out
}
