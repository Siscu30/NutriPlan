// Lee las capturas de la báscula en el propio dispositivo (OCR con Tesseract, gratis y sin enviar las imágenes a nadie).
// La primera vez descarga el lector y el idioma español (unos pocos MB); después quedan guardados.
import type { Worker } from 'tesseract.js'
import { today } from './dates'
import { parseScalePages, type OcrLine, type OcrPage, type ParsedScale } from './scaleParse'

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
  }
  onProgress({ stage: 'reading', pct: 1, index: images.length, total: images.length })
  return parseScalePages(pages, today())
}
