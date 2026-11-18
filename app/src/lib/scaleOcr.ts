// Lee las capturas de la báscula en el propio dispositivo (OCR con Tesseract, gratis y sin enviar las imágenes a nadie).
// La primera vez descarga el lector y el idioma español (unos pocos MB); después quedan guardados.
import type { Worker } from 'tesseract.js'
import { today } from './dates'
import { dateIn, parseScalePages, weightFromZoom, weightOf, type Box, type OcrLine, type OcrPage, type ParsedScale } from './scaleParse'

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

/** Escala a ~1200 px de ancho y devuelve dos versiones: original y gris invertido (texto oscuro sobre claro) */
async function variants(blob: Blob): Promise<{ canvases: HTMLCanvasElement[]; width: number }> {
  const bmp = await createImageBitmap(blob)
  // Las capturas del iPhone (1179-1320 px) se leen tal cual: reescalar emborrona los números pequeños
  const scale = bmp.width >= 900 && bmp.width <= 1600 ? 1 : 1200 / bmp.width
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
  const out = { canvases: [make(false), make(true)], width: w }
  bmp.close()
  return out
}

/** Lee una o varias capturas y une sus datos en un solo pesaje */
export async function readScaleScreens(images: Blob[], onProgress: (p: OcrProgress) => void): Promise<ParsedScale> {
  onLoad = (pct) => onProgress({ stage: 'loading', pct })
  onProgress({ stage: 'loading', pct: 0 })
  const w = await getWorker()
  const pages: OcrPage[] = []
  const sources: HTMLCanvasElement[] = []
  for (let i = 0; i < images.length; i++) {
    onProgress({ stage: 'reading', pct: i / images.length, index: i + 1, total: images.length })
    const { canvases, width } = await variants(images[i])
    const lines: OcrLine[] = []
    for (const c of canvases) {
      const { data } = await w.recognize(c, {}, { blocks: true })
      for (const b of data.blocks ?? [])
        for (const p of b.paragraphs)
          for (const l of p.lines) lines.push({ ...l.bbox, words: l.words.map((x) => ({ text: x.text, ...x.bbox })) })
    }
    pages.push({ lines, width })
    sources.push(canvases[0])
  }
  const zoom = await zoomReads(w, pages, sources)
  onProgress({ stage: 'reading', pct: 1, index: images.length, total: images.length })
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
async function zoomReads(w: Worker, pages: OcrPage[], sources: HTMLCanvasElement[]): Promise<{ weight?: number; date?: string }> {
  let best: { i: number; r: NonNullable<ReturnType<typeof weightOf>> } | null = null
  pages.forEach((p, i) => {
    const r = weightOf(p.lines)
    if (r && (!best || r.h > best.r.h)) best = { i, r }
  })
  if (!best) return {}
  const { i, r } = best as { i: number; r: NonNullable<ReturnType<typeof weightOf>> }
  const src = sources[i]
  const out: { weight?: number; date?: string } = {}
  try {
    await w.setParameters({ tessedit_char_whitelist: '0123456789,', tessedit_pageseg_mode: '7' as never })
    const pad = r.h * 0.15
    const wz = await w.recognize(crop(src, { x0: r.box.x0 - pad, y0: r.box.y0 - pad, x1: r.box.x1 + pad, y1: r.box.y1 + pad }, 1))
    out.weight = weightFromZoom(wz.data.text, r.intPart)
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
