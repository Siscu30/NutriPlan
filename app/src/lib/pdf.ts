// Lectura de PDFs en el navegador: renderiza páginas, extrae texto y localiza las fotos.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface PhotoBox {
  id: string
  /** Coordenadas normalizadas 0-1000 sobre la página */
  box: [number, number, number, number]
}

export interface PdfPage {
  n: number
  /** JPEG para enviar a Claude (base64 sin prefijo) */
  jpeg: string
  /** JPEG reducido para guardar como "página original" */
  thumb: string
  text: string
  photos: PhotoBox[]
  /** JPEG de la página a buena resolución, para recortar las fotos */
  full: string
}

type M = [number, number, number, number, number, number]
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
]

export async function readPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PdfPage[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: PdfPage[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: 1100 / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // Texto con posición vertical, para que Claude sepa qué hay junto a cada foto
    const tc = await page.getTextContent()
    const lines: { y: number; x: number; s: string }[] = []
    for (const it of tc.items) {
      if (!('str' in it) || !it.str.trim()) continue
      const [x, y] = viewport.convertToViewportPoint(it.transform[4], it.transform[5])
      lines.push({ y: Math.round((y / viewport.height) * 1000), x: Math.round((x / viewport.width) * 1000), s: it.str })
    }
    lines.sort((a, b) => a.y - b.y || a.x - b.x)
    const text = lines.map((l) => `[y${l.y}] ${l.s}`).join('\n')

    // Posición de las imágenes pintadas en la página
    const ops = await page.getOperatorList()
    const stack: M[] = []
    let ctm: M = [1, 0, 0, 1, 0, 0]
    const boxes: [number, number, number, number][] = []
    const O = pdfjs.OPS
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i]
      const args = ops.argsArray[i] as unknown[]
      if (fn === O.save) stack.push(ctm)
      else if (fn === O.restore) ctm = stack.pop() ?? ctm
      else if (fn === O.transform) ctm = mul(ctm, args as unknown as M)
      else if (fn === O.paintFormXObjectBegin) {
        stack.push(ctm)
        if (Array.isArray(args?.[0])) ctm = mul(ctm, args[0] as M)
      } else if (fn === O.paintFormXObjectEnd) ctm = stack.pop() ?? ctm
      else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageXObjectRepeat) {
        const pts = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([u, v]) => viewport.convertToViewportPoint(ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]))
        const xs = pts.map((p) => p[0])
        const ys = pts.map((p) => p[1])
        const b: [number, number, number, number] = [
          Math.max(0, Math.min(...xs)),
          Math.max(0, Math.min(...ys)),
          Math.min(viewport.width, Math.max(...xs)),
          Math.min(viewport.height, Math.max(...ys)),
        ]
        const area = ((b[2] - b[0]) * (b[3] - b[1])) / (viewport.width * viewport.height)
        if (area > 0.008 && area < 0.6) boxes.push(b)
      }
    }
    const photos = dedupe(boxes).map((b, k) => ({
      id: `p${n}f${k + 1}`,
      box: [
        Math.round((b[0] / viewport.width) * 1000),
        Math.round((b[1] / viewport.height) * 1000),
        Math.round((b[2] / viewport.width) * 1000),
        Math.round((b[3] / viewport.height) * 1000),
      ] as [number, number, number, number],
    }))

    pages.push({ n, jpeg: toJpeg(canvas, 1000, 0.72), thumb: toJpeg(canvas, 700, 0.6, true), full: canvas.toDataURL('image/jpeg', 0.86), text, photos })
    canvas.width = 0
    canvas.height = 0
    page.cleanup()
    onProgress(n, doc.numPages)
  }
  return pages
}

function dedupe(boxes: [number, number, number, number][]) {
  const out: typeof boxes = []
  for (const b of boxes) {
    const dup = out.find((o) => Math.abs(o[0] - b[0]) < 6 && Math.abs(o[1] - b[1]) < 6 && Math.abs(o[2] - b[2]) < 6 && Math.abs(o[3] - b[3]) < 6)
    if (!dup) out.push(b)
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

function toJpeg(src: HTMLCanvasElement, width: number, q: number, dataUrl = false): string {
  const c = document.createElement('canvas')
  c.width = width
  c.height = Math.round((src.height * width) / src.width)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', q)
  return dataUrl ? url : url.slice(url.indexOf(',') + 1)
}

/** Recorta una foto de la página (coordenadas 0-1000) y la devuelve como data URL cuadrada */
export async function cropPhoto(page: PdfPage, box: [number, number, number, number], size = 420): Promise<string> {
  const img = new Image()
  img.src = page.full
  await img.decode()
  const x0 = (box[0] / 1000) * img.width
  const y0 = (box[1] / 1000) * img.height
  const w = ((box[2] - box[0]) / 1000) * img.width
  const h = ((box[3] - box[1]) / 1000) * img.height
  const side = Math.min(w, h)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, x0 + (w - side) / 2, y0 + (h - side) / 2, side, side, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.78)
}
