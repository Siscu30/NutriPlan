import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { fmt } from '../../data/body'
import { shortDate } from '../../lib/dates'

export interface Point {
  date: string
  v: number
}

const ease = [0.22, 1, 0.36, 1] as const

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Curva suave (monótona) que no se pasa de los puntos */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const mx = (x1 - x0) / 2
    d += ` C${x0 + mx},${y0} ${x1 - mx},${y1} ${x1},${y1}`
  }
  return d
}

const dayMs = 86400000
const toT = (d: string) => new Date(d + 'T12:00:00').getTime()

export function LineChart({ data, unit, decimals, color = 'var(--accent)', height = 200 }: { data: Point[]; unit: string; decimals: number; color?: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')
  const key = data.map((p) => p.date + p.v).join('|')

  const pad = { t: 18, r: 14, b: 26, l: 40 }
  const iw = Math.max(1, w - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const vs = data.map((p) => p.v)
  let lo = Math.min(...vs)
  let hi = Math.max(...vs)
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.02)
  lo -= span * 0.18
  hi += span * 0.18
  const t0 = data.length ? toT(data[0].date) : 0
  const t1 = data.length ? toT(data[data.length - 1].date) : 1
  const x = (d: string) => pad.l + (t1 === t0 ? iw / 2 : ((toT(d) - t0) / (t1 - t0)) * iw)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * ih
  const pts = data.map((p) => [x(p.date), y(p.v)] as [number, number])
  const line = smooth(pts)
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z` : ''
  const ticks = [hi - (hi - lo) * 0.18, (hi + lo) / 2, lo + (hi - lo) * 0.18]
  const last = pts[pts.length - 1]

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    const px = clientX - r.left
    let best = 0
    pts.forEach((p, i) => Math.abs(p[0] - px) < Math.abs(pts[best][0] - px) && (best = i))
    setHover(best)
  }
  const h = hover != null ? data[hover] : null

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && data.length > 0 && (
        <svg
          width={w}
          height={height}
          className="touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Evolución: de ${fmt(data[0].v, decimals)} a ${fmt(data[data.length - 1].v, decimals)} ${unit}`}
        >
          <defs>
            <linearGradient id={`a-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0.28 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmt(v, decimals > 1 ? decimals : span < 3 ? 1 : 0)}
              </text>
            </g>
          ))}
          <text x={pad.l} y={height - 6} fontSize={11} fill="var(--muted)">
            {shortDate(data[0].date)}
          </text>
          {data.length > 1 && (
            <text x={w - pad.r} y={height - 6} textAnchor="end" fontSize={11} fill="var(--muted)">
              {shortDate(data[data.length - 1].date)}
            </text>
          )}

          <g key={key}>
            {area && <motion.path d={area} fill={`url(#a-${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }} />}
            {pts.length > 1 && (
              <motion.path d={line} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease }} />
            )}
            {pts.map(([px, py], i) => (
              <motion.circle
                key={i}
                cx={px}
                cy={py}
                r={3}
                fill="var(--bg)"
                stroke={color}
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + (pts.length > 1 ? (i / (pts.length - 1)) * 0.75 : 0), type: 'spring', stiffness: 500, damping: 20 }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            ))}
            {last && (
              <motion.circle
                cx={last[0]}
                cy={last[1]}
                r={4}
                fill={color}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ delay: 1, duration: 0.9, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            )}
          </g>

          {hover != null && (
            <g pointerEvents="none">
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + ih} stroke={color} strokeOpacity={0.4} strokeDasharray="3 3" />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill={color} />
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {h && hover != null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute top-0 rounded-xl bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent shadow-soft"
            style={{ left: Math.min(Math.max(pts[hover][0] - 50, 0), w - 100), width: 100, textAlign: 'center' }}
          >
            <span className="num">
              {fmt(h.v, decimals)} {unit}
            </span>
            <span className="block font-normal opacity-75">{shortDate(h.date)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const daysBetween = (a: string, b: string) => Math.round((toT(b) - toT(a)) / dayMs)
