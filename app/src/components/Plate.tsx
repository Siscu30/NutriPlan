import { motion } from 'motion/react'
import type { Macros } from '../lib/store'
import { AnimatedNumber, MACRO_META, softSpring } from './ui'

const R = 74
const C = 2 * Math.PI * R
const GAP = 6

/**
 * El plato del día: el aro se reparte según de dónde vienen las calorías
 * (proteína, hidratos, grasa). El aro fino exterior muestra lo ya comido.
 */
export function Plate({ m, eaten, size = 220 }: { m: Macros; eaten: number; size?: number }) {
  const kcal = { p: m.p * 4, c: m.c * 4, f: m.f * 9 }
  const total = kcal.p + kcal.c + kcal.f || 1
  let offset = 0
  const segs = MACRO_META.map((x) => {
    const len = Math.max(0, (kcal[x.key] / total) * C - GAP)
    const seg = { key: x.key, color: x.color, len, offset }
    offset += (kcal[x.key] / total) * C
    return seg
  })
  const outerR = 96
  const outerC = 2 * Math.PI * outerR

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="shadow-soft absolute inset-[5%] rounded-full" aria-hidden />
      <svg viewBox="0 0 220 220" className="relative size-full -rotate-90" aria-hidden>
        {/* borde del plato */}
        <circle cx="110" cy="110" r="104" fill="var(--surface)" />
        <circle cx="110" cy="110" r="88" fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle cx="110" cy="110" r={outerR} fill="none" stroke="var(--surface-2)" strokeWidth="3" />
        <motion.circle
          cx="110"
          cy="110"
          r={outerR}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={outerC}
          initial={{ strokeDashoffset: outerC }}
          animate={{ strokeDashoffset: outerC * (1 - Math.min(1, eaten)) }}
          transition={softSpring}
        />
        {segs.map((s) => (
          <motion.circle
            key={s.key}
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: 0 }}
            animate={{ strokeDasharray: `${Math.max(0.01, s.len - 12)} ${C}`, strokeDashoffset: -(s.offset + GAP / 2 + 6) }}
            transition={{ ...softSpring, delay: 0.05 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={m.k} className="display text-[44px] leading-none font-semibold" />
        <span className="mt-1 text-sm text-muted">kcal del día</span>
      </div>
    </div>
  )
}
