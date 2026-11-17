import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'motion/react'
import { useEffect } from 'react'
import type { Macros } from '../lib/store'

export const spring = { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 } as const
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } as const

/** Botón con respuesta física al pulsar */
export function Press({ className = '', ...props }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={spring}
      className={`cursor-pointer select-none ${className}`}
      {...props}
    />
  )
}

/** Número que se desliza hasta el nuevo valor */
export function AnimatedNumber({ value, decimals = 0, className = '' }: { value: number; decimals?: number; className?: string }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => v.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }))
  useEffect(() => {
    const c = animate(mv, value, { type: 'spring', stiffness: 140, damping: 22 })
    return c.stop
  }, [mv, value])
  return <motion.span className={`num ${className}`}>{text}</motion.span>
}

const MACRO_META = [
  { key: 'p', label: 'Proteína', color: 'var(--prot)', kcal: 4 },
  { key: 'c', label: 'Hidratos', color: 'var(--carb)', kcal: 4 },
  { key: 'f', label: 'Grasa', color: 'var(--fat)', kcal: 9 },
] as const
export { MACRO_META }

/** Fila compacta de macros: 32P · 40H · 12G */
export function MacroInline({ m, className = '' }: { m: Macros; className?: string }) {
  return (
    <span className={`num inline-flex items-center gap-2.5 text-[13px] text-muted ${className}`}>
      {MACRO_META.map((x) => (
        <span key={x.key} className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full" style={{ background: x.color }} />
          {Math.round(m[x.key])}
          <span className="sr-only">g de {x.label}</span>
        </span>
      ))}
    </span>
  )
}

/** Macros con etiqueta: P 22 g · H 43 g · G 15 g */
export function MacroChips({ m, className = '' }: { m: Macros; className?: string }) {
  return (
    <span className={`num inline-flex flex-wrap items-center gap-1.5 text-[13px] ${className}`}>
      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">
        <AnimatedNumber value={m.k} /> kcal
      </span>
      {MACRO_META.map((x) => (
        <span key={x.key} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `color-mix(in srgb, ${x.color} 16%, transparent)` }}>
          <span className="font-semibold" style={{ color: x.color }}>
            {x.label[0]}
          </span>
          <AnimatedNumber value={m[x.key]} />
          <span className="text-muted">g</span>
          <span className="sr-only">de {x.label}</span>
        </span>
      ))}
    </span>
  )
}

/** Foto redonda de la receta, con aro de macros alrededor */
export function Dish({ src, m, size = 56, className = '' }: { src?: string; m?: Macros; size?: number; className?: string }) {
  let ring = 'var(--surface-2)'
  if (m) {
    const parts = [m.p * 4, m.c * 4, m.f * 9]
    const tot = parts.reduce((a, b) => a + b, 0) || 1
    const cols = ['var(--prot)', 'var(--carb)', 'var(--fat)']
    let acc = 0
    ring = `conic-gradient(${parts
      .map((v, i) => {
        const from = (acc / tot) * 360
        acc += v
        return `${cols[i]} ${from}deg ${(acc / tot) * 360}deg`
      })
      .join(', ')})`
  }
  return (
    <span aria-hidden className={`relative grid shrink-0 place-items-center rounded-full ${className}`} style={{ width: size, height: size, background: ring }}>
      <span className="grid size-[calc(100%-6px)] place-items-center overflow-hidden rounded-full bg-surface">
        {src ? <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : <span className="size-1/2 rounded-full bg-surface-2" />}
      </span>
    </span>
  )
}

/** Barras de macros grandes, animadas */
export function MacroBars({ m }: { m: Macros }) {
  const total = m.p * 4 + m.c * 4 + m.f * 9 || 1
  return (
    <div className="grid grid-cols-3 gap-3">
      {MACRO_META.map((x) => {
        const share = (m[x.key] * x.kcal) / total
        return (
          <div key={x.key} className="min-w-0">
            <div className="flex items-baseline gap-1">
              <AnimatedNumber value={m[x.key]} className="display text-2xl font-semibold" />
              <span className="text-sm text-muted">g</span>
            </div>
            <div className="mt-1 text-[13px] text-muted">{x.label}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full"
                style={{ background: x.color }}
                initial={false}
                animate={{ width: `${Math.max(4, share * 100)}%` }}
                transition={softSpring}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
