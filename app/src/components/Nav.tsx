import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChefHat, Sun, Utensils, type LucideIcon } from 'lucide-react'
import { useRef, useEffect } from 'react'
import type { PersonId } from '../data/types'
import { actions, useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { DAY_SHORT, addDays, dayNum, longDate, mondayOf, today } from '../lib/dates'
import { Press, spring } from './ui'

export type Tab = 'hoy' | 'semana' | 'recetas' | 'guia'
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun },
  { id: 'semana', label: 'Semana', icon: CalendarDays },
  { id: 'recetas', label: 'Recetas', icon: ChefHat },
  { id: 'guia', label: 'Guía', icon: Utensils },
]

function TabIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <motion.span
      key={String(active)}
      initial={active ? { scale: 0.6, rotate: -18 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 14 }}
      className="grid place-items-center"
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
    </motion.span>
  )
}

/** Barra inferior flotante (móvil) */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Secciones"
      className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 md:hidden"
    >
      <div className="glass shadow-soft pointer-events-auto mb-3 flex items-center gap-1 rounded-[28px] border border-line p-1.5">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <Press
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={t.label}
              className={`relative flex h-12 items-center gap-2 rounded-[22px] px-4 ${active ? 'text-on-accent' : 'text-muted'}`}
            >
              {active && (
                <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-[22px] bg-accent" />
              )}
              <span className="relative">
                <TabIcon icon={t.icon} active={active} />
              </span>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={spring}
                    className="relative overflow-hidden text-[15px] font-semibold whitespace-nowrap"
                  >
                    {t.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Press>
          )
        })}
      </div>
    </nav>
  )
}

/** Riel lateral (escritorio) */
export function SideRail({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav aria-label="Secciones" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line px-4 py-8 md:flex">
      <div className="mb-8 flex items-center gap-3 px-3">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-9 rounded-xl" />
        <span className="display text-2xl font-semibold">Plato</span>
      </div>
      {TABS.map((t) => {
        const active = t.id === tab
        return (
          <Press
            key={t.id}
            onClick={() => onChange(t.id)}
            whileHover={{ x: 3 }}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium ${active ? 'text-on-accent' : 'text-muted hover:text-ink'}`}
          >
            {active && <motion.span layoutId="rail-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-accent" />}
            <span className="relative">
              <TabIcon icon={t.icon} active={active} />
            </span>
            <span className="relative">{t.label}</span>
          </Press>
        )
      })}
    </nav>
  )
}

/** Selector Francisco / Lua */
export function PersonSwitch() {
  const person = useStore((s) => s.person)
  const names = useStore((s) => s.shared.names)
  const { profile } = useAuth()
  const ids = (['fran', 'lua'] as PersonId[]).filter((id) => profile?.can_view.includes(id))
  if (ids.length < 2) return null
  return (
    <div role="radiogroup" aria-label="Plan de" className="flex rounded-full border border-line bg-surface p-1">
      {ids.map((id) => {
        const active = id === person
        return (
          <Press
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => actions.setPerson(id)}
            className={`relative h-9 rounded-full px-4 text-sm font-semibold ${active ? 'text-on-accent' : 'text-muted'}`}
          >
            {active && <motion.span layoutId="person-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative">{names[id]}</span>
          </Press>
        )
      })}
    </div>
  )
}

/** Tira de días de la semana */
export function DayStrip({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const monday = mondayOf(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const t = today()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [date])

  return (
    <div className="flex items-center gap-2">
      <div ref={ref} className="no-scrollbar flex flex-1 gap-1 overflow-x-auto md:gap-1.5">
        {days.map((d, i) => {
          const active = d === date
          const isToday = d === t
          return (
            <Press
              key={d}
              onClick={() => onChange(d)}
              aria-pressed={active}
              aria-label={longDate(d)}
              className={`relative flex h-16 min-w-10 flex-1 flex-col items-center justify-center rounded-2xl ${active ? 'text-on-accent' : 'text-ink'}`}
            >
              {active && <motion.span layoutId="day-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-accent" />}
              <span className={`relative text-xs ${active ? 'opacity-80' : 'text-muted'}`}>{DAY_SHORT[i]}</span>
              <span className="display num relative text-xl font-semibold">{dayNum(d)}</span>
              {isToday && <span className={`relative mt-0.5 size-1 rounded-full ${active ? 'bg-on-accent' : 'bg-carb'}`} />}
            </Press>
          )
        })}
      </div>
    </div>
  )
}
