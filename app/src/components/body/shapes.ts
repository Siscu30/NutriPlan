// Geometría de las figuras: contorno de media figura (lado derecho de la imagen),
// que se refleja y se suaviza con curvas Catmull-Rom. Coordenadas en un lienzo de 360 × 540.
import type { MeasureKey } from '../../data/body'
import type { PersonId } from '../../data/types'

export const VIEW = { w: 360, h: 540, cx: 180 }

/** [x desde el centro, y, esquina?] */
type Pt = [number, number, 1?]

// Canon de 8 cabezas (~62 px): barbilla 1, pezones 2, ombligo y codos 3, entrepierna y muñecas 4, rodillas 6
const MALE: Pt[] = [
  [0, 18], [15, 21], [22, 33], [24, 48], [22, 63], [18, 73], [12, 81],
  [12, 88], [14, 96], [32, 103], [50, 109], [61, 117], [67, 132],
  [68, 150], [70, 172], [73, 198], [77, 222], [80, 248], [82, 266],
  [86, 280], [87, 298], [83, 313], [77, 318, 1], [72, 307], [71, 288], [70, 272],
  [67, 262], [62, 232], [58, 205], [54, 178], [49, 146, 1],
  [47, 160], [44, 185], [41, 203], [43, 224], [48, 246], [51, 266],
  [51, 292], [48, 330], [44, 368], [42, 392], [44, 416], [42, 448], [33, 490],
  [36, 505], [37, 515], [23, 519, 1], [18, 507], [16, 491],
  [14, 448], [13, 418], [13, 392], [11, 355], [7, 300], [0, 270, 1],
]

const FEMALE: Pt[] = [
  [0, 22], [13, 24], [19, 34], [20, 48], [18, 62], [14, 72], [9, 79],
  [9, 90], [11, 98], [26, 102], [39, 107], [47, 115], [51, 129],
  [52, 150], [54, 172], [56, 198], [60, 224], [63, 248], [65, 264],
  [68, 278], [69, 294], [66, 308], [61, 312, 1], [57, 302], [56, 286], [55, 272],
  [53, 262], [49, 232], [45, 205], [42, 178], [40, 144, 1],
  [41, 152], [39, 170], [33, 192], [31, 204], [34, 220], [42, 240], [49, 258], [51, 276],
  [49, 300], [45, 336], [40, 370], [37, 392], [39, 414], [36, 448], [26, 490],
  [29, 503], [30, 512], [19, 515, 1], [15, 503], [13, 490],
  [12, 448], [11, 414], [10, 392], [9, 360], [6, 310], [0, 276, 1],
]

/** Pelo: melena por detrás y parte de arriba por delante */
const HAIR_BACK: Pt[] = [[0, 13], [17, 15], [27, 28], [30, 50], [30, 80], [33, 106], [37, 128], [31, 134, 1], [24, 124], [17, 104], [13, 88], [0, 86, 1]]
const HAIR_FRONT_F: Pt[] = [[0, 16], [15, 18], [21, 29], [22, 44, 1], [17, 34], [9, 30], [0, 31, 1]]
const HAIR_FRONT_M: Pt[] = [[0, 14], [16, 17], [23, 29], [24, 41, 1], [21, 31], [11, 27], [0, 28, 1]]

/** Curva suave y cerrada que pasa por todos los puntos (las esquinas quedan marcadas) */
function closedSpline(pts: Pt[], tension = 0.55): string {
  const n = pts.length
  const P = (i: number) => pts[(i + n) % n]
  let d = `M${P(0)[0].toFixed(1)},${P(0)[1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    const k1 = p1[2] ? 0 : tension / 3
    const k2 = p2[2] ? 0 : tension / 3
    const c1 = [p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1]
    const c2 = [p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/** Refleja la media figura y la centra en el lienzo */
function silhouette(half: Pt[]): string {
  const right = half.map(([x, y, c]): Pt => [VIEW.cx + x, y, c])
  const left = half
    .slice(1, -1)
    .reverse()
    .map(([x, y, c]): Pt => [VIEW.cx - x, y, c])
  return closedSpline([...right, ...left])
}

/** Línea simétrica: devuelve el trazo de un lado y su reflejo */
const both = (d: (s: 1 | -1) => string) => [d(-1), d(1)]
const X = (x: number) => VIEW.cx + x

export interface Tape {
  key: MeasureKey
  /** Centro y radios de la cinta (elipse), y giro para seguir el brazo o la pierna */
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
  /** Lado de la etiqueta */
  side: 'left' | 'right'
  labelY: number
  /** Zona que se colorea: rectángulo recortado por la silueta */
  zone: { x: number; y: number; w: number; h: number }
}

export interface Figure {
  body: string
  /** Pelo: melena (detrás del cuerpo) y parte de arriba (delante) */
  hair?: string
  hairFront?: string
  /** Detalles anatómicos: líneas finas */
  details: string[]
  tapes: Tape[]
}

const maleDetails = [
  ...both((s) => `M${X(s * 7)},103 Q${X(s * 24)},98 ${X(s * 42)},106`), // clavículas
  ...both((s) => `M${X(s * 2)},116 C${X(s * 10)},139 ${X(s * 35)},144 ${X(s * 46)},131`), // pectorales
  ...both((s) => `M${X(s * 52)},112 Q${X(s * 65)},128 ${X(s * 62)},152`), // deltoides
  `M${X(0)},146 L${X(0)},196`, // línea alba
  ...both((s) => `M${X(s * 3)},162 Q${X(s * 12)},160 ${X(s * 18)},164`),
  ...both((s) => `M${X(s * 3)},180 Q${X(s * 12)},178 ${X(s * 18)},182`),
  ...both((s) => `M${X(s * 37)},222 Q${X(s * 23)},246 ${X(s * 7)},262`), // oblicuos (V)
  ...both((s) => `M${X(s * 39)},292 Q${X(s * 33)},336 ${X(s * 22)},374`), // cuádriceps
  ...both((s) => `M${X(s * 33)},392 Q${X(s * 28)},401 ${X(s * 20)},393`), // rodillas
  ...both((s) => `M${X(s * 43)},420 Q${X(s * 41)},440 ${X(s * 35)},458`), // gemelos
  ...both((s) => `M${X(s * 61)},202 Q${X(s * 66)},206 ${X(s * 71)},202`), // codos
  ...both((s) => `M${X(s * 21)},44 Q${X(s * 26)},50 ${X(s * 21)},58`), // orejas
]

const femaleDetails = [
  ...both((s) => `M${X(s * 5)},101 Q${X(s * 18)},97 ${X(s * 34)},104`),
  ...both((s) => `M${X(s * 37)},144 C${X(s * 35)},164 ${X(s * 18)},170 ${X(s * 5)},158`), // pecho
  ...both((s) => `M${X(s * 43)},112 Q${X(s * 52)},126 ${X(s * 51)},146`),
  `M${X(0)},176 L${X(0)},196`,
  ...both((s) => `M${X(s * 33)},236 Q${X(s * 20)},254 ${X(s * 6)},266`),
  ...both((s) => `M${X(s * 36)},300 Q${X(s * 31)},340 ${X(s * 21)},374`),
  ...both((s) => `M${X(s * 29)},392 Q${X(s * 24)},400 ${X(s * 17)},393`),
  ...both((s) => `M${X(s * 37)},418 Q${X(s * 36)},436 ${X(s * 31)},454`),
  ...both((s) => `M${X(s * 46)},202 Q${X(s * 50)},205 ${X(s * 54)},202`),
]

const navel = (y: number) => `M${X(0)},${y - 3} Q${X(1.8)},${y} ${X(0)},${y + 3} Q${X(-1.8)},${y} ${X(0)},${y - 3}`

export const FIGURES: Record<PersonId, Figure> = {
  fran: {
    body: silhouette(MALE),
    hairFront: silhouette(HAIR_FRONT_M),
    details: [...maleDetails, navel(205)],
    tapes: [
      { key: 'cuello', cx: X(0), cy: 90, rx: 13.5, ry: 3.5, rot: 0, side: 'right', labelY: 68, zone: { x: X(-20), y: 82, w: 40, h: 18 } },
      { key: 'pecho', cx: X(0), cy: 138, rx: 48, ry: 6, rot: 0, side: 'right', labelY: 118, zone: { x: X(-48), y: 104, w: 96, h: 56 } },
      { key: 'biceps', cx: X(-60.5), cy: 160, rx: 10, ry: 3.5, rot: 8, side: 'left', labelY: 150, zone: { x: X(-82), y: 118, w: 32, h: 82 } },
      { key: 'bicepsC', cx: X(60.5), cy: 160, rx: 10, ry: 3.5, rot: -8, side: 'right', labelY: 170, zone: { x: X(50), y: 118, w: 32, h: 82 } },
      { key: 'cintura', cx: X(0), cy: 205, rx: 42, ry: 5.5, rot: 0, side: 'right', labelY: 222, zone: { x: X(-46), y: 178, w: 92, h: 54 } },
      { key: 'cadera', cx: X(0), cy: 256, rx: 50, ry: 6, rot: 0, side: 'right', labelY: 274, zone: { x: X(-54), y: 232, w: 108, h: 56 } },
      { key: 'cuadriceps', cx: X(-29), cy: 325, rx: 20, ry: 4.5, rot: 3, side: 'left', labelY: 330, zone: { x: X(-56), y: 290, w: 53, h: 72 } },
    ],
  },
  lua: {
    body: silhouette(FEMALE),
    hair: silhouette(HAIR_BACK),
    hairFront: silhouette(HAIR_FRONT_F),
    details: [...femaleDetails, navel(207)],
    tapes: [
      { key: 'cuello', cx: X(0), cy: 92, rx: 10.5, ry: 3, rot: 0, side: 'right', labelY: 68, zone: { x: X(-14), y: 84, w: 28, h: 16 } },
      { key: 'pecho', cx: X(0), cy: 150, rx: 42, ry: 6, rot: 0, side: 'right', labelY: 124, zone: { x: X(-42), y: 104, w: 84, h: 68 } },
      { key: 'biceps', cx: X(-47), cy: 162, rx: 7, ry: 2.8, rot: 6, side: 'left', labelY: 152, zone: { x: X(-66), y: 118, w: 24, h: 82 } },
      { key: 'bicepsC', cx: X(47), cy: 162, rx: 7, ry: 2.8, rot: -6, side: 'right', labelY: 176, zone: { x: X(42), y: 118, w: 24, h: 82 } },
      { key: 'cintura', cx: X(0), cy: 204, rx: 32, ry: 5, rot: 0, side: 'right', labelY: 226, zone: { x: X(-40), y: 176, w: 80, h: 56 } },
      { key: 'cadera', cx: X(0), cy: 266, rx: 51, ry: 6.5, rot: 0, side: 'right', labelY: 278, zone: { x: X(-53), y: 236, w: 106, h: 56 } },
      { key: 'cuadriceps', cx: X(-27), cy: 326, rx: 19, ry: 4.5, rot: 3, side: 'left', labelY: 330, zone: { x: X(-52), y: 296, w: 50, h: 66 } },
    ],
  },
}
