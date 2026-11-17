import { motion } from 'motion/react'
import { MEAL_LABEL, SLOTS, type SlotMeal } from '../data/types'
import { PersonSwitch } from '../components/Nav'
import { AnimatedNumber, Dish, Press, spring } from '../components/ui'
import { DAY_NAME, addDays, dayNum, mondayOf, shortDate, today } from '../lib/dates'
import { activePlan, addMacros, macrosOf, planDay, slotItems, useStore, ZERO } from '../lib/store'

export function Semana({
  offset,
  setOffset,
  openSlot,
  goDay,
}: {
  /** Semanas desde la actual (0 = esta) */
  offset: number
  setOffset: (n: number) => void
  openSlot: (date: string, slot: SlotMeal) => void
  goDay: (date: string) => void
}) {
  const state = useStore((s) => s)
  const t = today()
  const monday = addDays(mondayOf(t), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const plan = activePlan(state, state.person, monday)
  const { week } = planDay(plan, monday)
  const options = [-1, 0, 1, 2]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {plan.name} · del {shortDate(monday)} al {shortDate(addDays(monday, 6))}
          </p>
          <h1 className="display text-[30px] leading-tight font-semibold md:text-4xl">Semana {week + 1}</h1>
        </div>
        <PersonSwitch />
      </header>

      <div role="tablist" aria-label="Semana" className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 md:inline-flex">
        {options.map((o) => (
          <Press
            key={o}
            role="tab"
            aria-selected={o === offset}
            onClick={() => setOffset(o)}
            className={`relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${o === offset ? 'text-on-accent' : 'text-muted'}`}
          >
            {o === offset && <motion.span layoutId="week-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative">{o === -1 ? 'Anterior' : o === 0 ? 'Esta semana' : o === 1 ? 'Próxima' : 'En 2 semanas'}</span>
          </Press>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((date, i) => {
          const items = SLOTS.map((slot) => ({ slot, items: slotItems(state, state.person, date, slot) }))
          const k = items.flatMap((x) => x.items).reduce((a, it) => addMacros(a, macrosOf(it.ings, state)), ZERO).k
          const isToday = date === t
          return (
            <motion.article
              key={`${offset}-${state.person}-${date}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.03 }}
              className={`rounded-[28px] border bg-surface p-2 ${isToday ? 'border-carb' : 'border-line'}`}
            >
              <Press whileHover={{ scale: 1 }} whileTap={{ scale: 0.98 }} onClick={() => goDay(date)} className="flex w-full items-baseline gap-3 rounded-2xl px-3 pt-2 pb-2 text-left">
                <span className="display num text-3xl font-semibold">{dayNum(date)}</span>
                <span className="flex-1 font-semibold">
                  {DAY_NAME[i]}
                  {isToday && <span className="ml-2 text-sm font-medium text-carb">hoy</span>}
                </span>
                <span className="num text-sm text-muted">
                  <AnimatedNumber value={k} className="font-semibold text-ink" /> kcal
                </span>
              </Press>
              <ul>
                {items.map(({ slot, items: its }) => (
                  <li key={slot}>
                    <Press
                      whileHover={{ scale: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openSlot(date, slot)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="flex shrink-0 -space-x-3">
                        {its.slice(0, 2).map((x) => (
                          <Dish key={x.recipe.id} src={x.recipe.img} size={40} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] text-muted">{MEAL_LABEL[slot]}</span>
                        <span className="block text-[14px] leading-snug">{its.map((x) => x.recipe.name).join(' + ')}</span>
                      </span>
                    </Press>
                  </li>
                ))}
              </ul>
            </motion.article>
          )
        })}
      </div>

      {plan.notes && plan.notes.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm text-muted">
          {plan.notes.map((n) => (
            <li key={n} className="rounded-2xl bg-surface-2 px-4 py-3">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
