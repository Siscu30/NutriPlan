import { motion } from 'motion/react'
import { useId } from 'react'
import { MEASURES, fmt, fmtDelta, type MeasureKey } from '../../data/body'
import type { PersonId } from '../../data/types'
import { FIGURES, VIEW, type Tape } from './shapes'

export type ToneName = 'good' | 'bad' | 'flat'
const TONE: Record<ToneName, string> = { good: 'var(--veg)', bad: 'var(--carb)', flat: 'var(--muted)' }
const META = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<MeasureKey, (typeof MEASURES)[number]>

const ease = [0.22, 1, 0.36, 1] as const

export interface FigureProps {
  person: PersonId
  /** Último valor de cada medida */
  values: Partial<Record<MeasureKey, number>>
  /** Modo evolución: cambio y tono por medida */
  deltas?: Partial<Record<MeasureKey, { d: number; tone: ToneName }>>
  selected?: MeasureKey | null
  onSelect?: (k: MeasureKey) => void
  /** Cambia para repetir la animación de relleno (p. ej. al cambiar de comparación) */
  replay?: string
}

export function BodyFigure({ person, values, deltas, selected, onSelect, replay }: FigureProps) {
  const fig = FIGURES[person]
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `${n}-${uid}`
  const evolution = !!deltas

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="h-auto w-full select-none" role="group" aria-label={evolution ? 'Evolución de las medidas sobre el cuerpo' : 'Dónde tomar cada medida'}>
      <defs>
        <linearGradient id={id('fill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--accent) 30%, var(--surface))' }} />
          <stop offset="0.55" style={{ stopColor: 'color-mix(in srgb, var(--accent) 18%, var(--surface))' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--accent) 10%, var(--surface))' }} />
        </linearGradient>
        {/* Volumen: bordes más oscuros, centro con brillo */}
        <linearGradient id={id('side')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.28" style={{ stopColor: 'var(--ink)', stopOpacity: 0.2 }} />
          <stop offset="0.42" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
          <stop offset="0.58" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
          <stop offset="0.72" style={{ stopColor: 'var(--ink)', stopOpacity: 0.2 }} />
        </linearGradient>
        <radialGradient id={id('sheen')} cx="0.5" cy="0.28" r="0.32">
          <stop offset="0" style={{ stopColor: 'var(--surface)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--surface)', stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={id('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a3d" />
          <stop offset="1" stopColor="#3a2620" />
        </linearGradient>
        {/* Relleno de zona con bordes difuminados arriba y abajo */}
        {(['good', 'bad', 'flat', 'sel'] as const).map((k) => (
          <linearGradient key={k} id={id(`zone-${k}`)} x1="0" y1="0" x2="0" y2="1">
            {[0, 0.28, 0.72, 1].map((o) => (
              <stop key={o} offset={o} style={{ stopColor: k === 'sel' ? 'var(--accent)' : TONE[k], stopOpacity: o === 0 || o === 1 ? 0 : 1 }} />
            ))}
          </linearGradient>
        ))}
        <clipPath id={id('clip')}>
          <path d={fig.body} />
        </clipPath>
      </defs>

      {/* Suelo */}
      <motion.ellipse cx={VIEW.cx} cy={522} rx={70} ry={7} fill="var(--ink)" initial={{ opacity: 0, scaleX: 0.4 }} animate={{ opacity: 0.08, scaleX: 1 }} transition={{ duration: 0.9, ease }} style={{ transformOrigin: `${VIEW.cx}px 522px` }} />

      {fig.hair && <motion.path d={fig.hair} fill={`url(#${id('hair')})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }} />}

      {/* Silueta: el trazo se dibuja y después aparece el relleno */}
      <motion.path d={fig.body} fill={`url(#${id('fill')})`} initial={{ fillOpacity: 0 }} animate={{ fillOpacity: 1 }} transition={{ delay: 0.35, duration: 0.8, ease }} />
      <g clipPath={`url(#${id('clip')})`}>
        <motion.rect x="0" y="0" width={VIEW.w} height={VIEW.h} fill={`url(#${id('side')})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} />
        <motion.rect x="0" y="0" width={VIEW.w} height={VIEW.h} fill={`url(#${id('sheen')})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} />
        {/* Zonas coloreables */}
        {fig.tapes.map((t) => {
          const active = selected === t.key
          const tone = deltas?.[t.key]?.tone
          const fill = `url(#${id(`zone-${tone ?? 'sel'}`)})`
          const target = tone && tone !== 'flat' ? 0.55 : active ? 0.32 : 0
          return (
            <motion.rect
              key={`${t.key}-${replay ?? ''}`}
              x={t.zone.x}
              y={t.zone.y}
              width={t.zone.w}
              height={t.zone.h}
              fill={fill}
              initial={{ opacity: 0 }}
              animate={{ opacity: active && tone ? Math.min(0.62, target + 0.18) : target }}
              transition={{ delay: evolution ? 0.9 + order(t.key) * 0.08 : 0, duration: 0.7, ease }}
            />
          )
        })}
      </g>
      <motion.path
        d={fig.body}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.32}
        strokeWidth={1.2}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease }}
      />
      {fig.details.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={0.2}
          strokeWidth={1}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.6 + i * 0.025, duration: 0.6, ease }}
        />
      ))}

      {fig.hairFront && <motion.path d={fig.hairFront} fill={`url(#${id('hair')})`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6, ease }} />}

      {fig.tapes.map((t) => (
        <TapeMark
          key={t.key}
          t={t}
          value={values[t.key]}
          delta={deltas?.[t.key]}
          active={selected === t.key}
          dim={!!selected && selected !== t.key}
          onSelect={onSelect}
        />
      ))}
    </svg>
  )
}

const ORDER: MeasureKey[] = ['cuello', 'pecho', 'biceps', 'bicepsC', 'cintura', 'cadera', 'cuadriceps']
const order = (k: MeasureKey) => ORDER.indexOf(k)

function TapeMark({
  t,
  value,
  delta,
  active,
  dim,
  onSelect,
}: {
  t: Tape
  value?: number
  delta?: { d: number; tone: ToneName }
  active: boolean
  dim: boolean
  onSelect?: (k: MeasureKey) => void
}) {
  const meta = META[t.key]
  const delay = 0.9 + order(t.key) * 0.09
  const left = t.side === 'left'
  // Extremo de la cinta del lado de la etiqueta (teniendo en cuenta el giro)
  const a = (t.rot * Math.PI) / 180
  const ex = t.cx + (left ? -t.rx : t.rx) * Math.cos(a)
  const ey = t.cy + (left ? -t.rx : t.rx) * Math.sin(a)
  const lx = left ? 74 : VIEW.w - 74
  const tx = left ? 8 : VIEW.w - 8
  const anchor = left ? 'start' : 'end'
  const front = `M${t.cx - t.rx},${t.cy} A${t.rx},${t.ry} 0 0 0 ${t.cx + t.rx},${t.cy}`
  const back = `M${t.cx - t.rx},${t.cy} A${t.rx},${t.ry} 0 0 1 ${t.cx + t.rx},${t.cy}`
  const tapeColor = delta ? (delta.tone === 'flat' ? 'var(--ink)' : delta.tone === 'good' ? 'var(--veg)' : 'var(--carb)') : 'var(--carb)'
  const select = () => onSelect?.(t.key)
  const label = `${meta.label}: ${value != null ? `${fmt(value, 1)} cm` : 'sin medir'}${delta ? `, ${fmtDelta(delta.d, 1)} cm` : ''}`

  return (
    <motion.g
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={label}
      aria-pressed={onSelect ? active : undefined}
      onClick={select}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select())}
      className={onSelect ? 'cursor-pointer outline-none' : undefined}
      animate={{ opacity: dim ? 0.38 : 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Zona táctil generosa */}
      <rect x={Math.min(ex, lx) - 6} y={Math.min(ey, t.labelY) - 18} width={Math.abs(lx - ex) + 12} height={Math.abs(t.labelY - ey) + 30} fill="transparent" />
      <rect x={t.zone.x} y={t.zone.y} width={t.zone.w} height={t.zone.h} fill="transparent" />
      <rect x={left ? 0 : lx} y={t.labelY - 18} width={74} height={34} fill="transparent" />

      <g transform={`rotate(${t.rot} ${t.cx} ${t.cy})`}>
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease }}
      >
        {/* Parte de atrás, intuida */}
        <motion.path d={back} fill="none" stroke={tapeColor} strokeWidth={1.4} strokeDasharray="2 3" initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ delay: delay + 0.2, duration: 0.4 }} />
        {/* Halo al seleccionar */}
        <motion.path d={front} fill="none" stroke={tapeColor} strokeWidth={8} strokeLinecap="round" initial={false} animate={{ opacity: active ? 0.25 : 0 }} transition={{ duration: 0.3 }} />
        {/* Cinta: se cierra alrededor de la zona */}
        <motion.path d={front} fill="none" stroke={tapeColor} strokeWidth={active ? 3.4 : 2.6} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay, duration: 0.55, ease }} />
        {/* Marcas de la cinta métrica */}
        <motion.path d={front} fill="none" stroke="var(--surface)" strokeWidth={2.6} strokeDasharray="0.7 3.3" initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: delay + 0.45, duration: 0.3 }} />
      </motion.g>
      </g>

      {/* Guía hasta la etiqueta */}
      <motion.path
        d={`M${ex},${ey} L${ex + (left ? -6 : 6)},${ey} L${lx},${t.labelY}`}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={active ? 0.6 : 0.28}
        strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: delay + 0.35, duration: 0.35, ease }}
      />
      <motion.circle cx={ex} cy={ey} r={active ? 3.2 : 2.4} fill={tapeColor} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: delay + 0.3, type: 'spring', stiffness: 500, damping: 18 }} />

      <motion.g initial={{ opacity: 0, x: left ? -6 : 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.45, duration: 0.35, ease }}>
        <text x={tx} y={t.labelY - 4} textAnchor={anchor} fontSize={10.5} fill="var(--muted)" fontWeight={active ? 700 : 500}>
          {meta.short}
        </text>
        <text x={tx} y={t.labelY + 11} textAnchor={anchor} fontSize={13.5} fontWeight={700} fill={delta && delta.tone !== 'flat' ? TONE[delta.tone] : 'var(--ink)'} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {delta ? `${fmtDelta(delta.d, 1)} cm` : value != null ? `${fmt(value, 1)} cm` : '—'}
        </text>
      </motion.g>
    </motion.g>
  )
}
