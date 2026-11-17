import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronRight, Settings2 } from 'lucide-react'
import { MEAL_LABEL, SLOTS, SLOT_HOUR, type SlotMeal } from '../data/types'
import { DayStrip, PersonSwitch } from '../components/Nav'
import { Plate } from '../components/Plate'
import { AnimatedNumber, Dish, MacroBars, MacroChips, Press, spring } from '../components/ui'
import { longDate, today } from '../lib/dates'
import { actions, activePlan, addMacros, macrosOf, planDay, slotItems, slotKey, useStore, ZERO } from '../lib/store'

export function Hoy({
  date,
  setDate,
  openSlot,
  openSettings,
}: {
  date: string
  setDate: (d: string) => void
  openSlot: (slot: SlotMeal) => void
  openSettings: () => void
}) {
  const state = useStore((s) => s)
  const person = state.person
  const plan = activePlan(state, person, date)
  const { week } = planDay(plan, date)
  const rows = SLOTS.map((slot) => {
    const items = slotItems(state, person, date, slot).map((it) => ({ ...it, m: macrosOf(it.ings, state) }))
    const m = items.reduce((a, it) => addMacros(a, it.m), ZERO)
    const key = slotKey(person, date, slot)
    return { slot, items, m, key, done: !!state.people[person].done[key], changed: !!state.people[person].overrides[key] }
  })
  const total = rows.reduce((a, r) => addMacros(a, r.m), ZERO)
  const eatenK = rows.filter((r) => r.done).reduce((a, r) => a + r.m.k, 0)
  const isToday = date === today()

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {plan.name} · semana {week + 1}
          </p>
          <h1 className="display truncate text-[30px] leading-tight font-semibold md:text-4xl">{isToday ? 'Hoy' : longDate(date).split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <PersonSwitch />
          <Press onClick={openSettings} aria-label="Ajustes y planes" className="grid size-11 place-items-center rounded-full border border-line bg-surface">
            <Settings2 className="size-5" />
          </Press>
        </div>
      </header>

      <div className="mt-5">
        <DayStrip date={date} onChange={setDate} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-10">
        <section aria-label="Resumen del día" className="md:sticky md:top-8 md:self-start">
          <div className="flex flex-col items-center">
            <Plate m={total} eaten={total.k ? eatenK / total.k : 0} />
            <p className="mt-3 text-sm text-muted">
              {eatenK > 0 ? (
                <>
                  Llevas <AnimatedNumber value={eatenK} className="font-semibold text-ink" /> kcal
                </>
              ) : (
                longDate(date)
              )}
            </p>
          </div>
          <div className="mt-6 rounded-3xl bg-surface p-5">
            <MacroBars m={total} />
          </div>
        </section>

        <section aria-label="Comidas" className="relative">
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <motion.li
                key={`${person}-${date}-${r.slot}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
              >
                <div className={`overflow-hidden rounded-[28px] border border-line transition-colors ${r.done ? 'bg-surface-2' : 'bg-surface shadow-soft'}`}>
                  <div className="flex items-center gap-2 px-4 pt-3.5">
                    <span className="text-[15px] font-semibold">{MEAL_LABEL[r.slot]}</span>
                    <span className="num text-[13px] text-muted">{SLOT_HOUR[r.slot]}</span>
                    {r.changed && <span className="rounded-full bg-carb/15 px-2 py-px text-[11px] font-semibold text-carb">Cambiado</span>}
                    <span className="num ml-auto text-sm font-semibold">
                      <AnimatedNumber value={r.m.k} /> kcal
                    </span>
                    <DoneToggle done={r.done} onToggle={() => actions.toggleDone(person, r.key)} label={MEAL_LABEL[r.slot]} />
                  </div>
                  <Press
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openSlot(r.slot)}
                    className="block w-full px-2 pt-1 pb-2 text-left"
                    aria-label={`Abrir ${MEAL_LABEL[r.slot]}`}
                  >
                    {r.items.map((it) => (
                      <span key={it.recipe.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                        <Dish src={it.recipe.img} m={it.m} size={64} className={r.done ? 'opacity-60' : ''} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[16px] leading-snug font-medium text-balance ${r.done ? 'text-muted line-through decoration-1' : ''}`}>{it.recipe.name}</span>
                          <MacroChips m={it.m} className="mt-1.5" />
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted" />
                      </span>
                    ))}
                    {r.items.length === 0 && <span className="block px-2 py-3 text-muted">Sin plato. Toca para elegir uno.</span>}
                  </Press>
                </div>
              </motion.li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function DoneToggle({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <Press
      onClick={onToggle}
      whileTap={{ scale: 0.8 }}
      aria-pressed={done}
      aria-label={`${label}: ${done ? 'comido' : 'marcar como comido'}`}
      className="-my-1 -mr-1 grid size-10 shrink-0 place-items-center"
    >
      <motion.span
        animate={{ backgroundColor: done ? 'var(--veg)' : 'var(--surface)', borderColor: done ? 'var(--veg)' : 'var(--muted)' }}
        transition={spring}
        className="grid size-7 place-items-center rounded-full border-2"
      >
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 700, damping: 16 }}>
              <Check className="size-3.5 text-on-accent" strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </Press>
  )
}
