import { AnimatePresence, motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { MEAL_LABEL, type Meal } from '../data/types'
import { HOUSE_BREAKFAST } from '../data/seed'
import { norm } from '../components/RecipeSheet'
import { Dish, MacroChips, Press, spring } from '../components/ui'
import { activePlan, macrosOf, recipeIngs, useStore } from '../lib/store'

const FILTERS: (Meal | 'todas')[] = ['todas', 'desayuno', 'comida', 'merienda', 'cena', 'extra']

export function Recetas({ date, openRecipe }: { date: string; openRecipe: (planId: string, id: string) => void }) {
  const state = useStore((s) => s)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Meal | 'todas'>('todas')
  const plan = activePlan(state, state.person, date)
  const all = [HOUSE_BREAKFAST[state.person], ...plan.recipes]
  const list = all
    .filter((r) => filter === 'todas' || r.meal.includes(filter))
    .filter((r) => norm(`${r.name} ${r.group ?? ''} ${r.ing.map((i) => i.f).join(' ')}`).includes(norm(q)))

  const groups = new Map<string, typeof list>()
  for (const r of list) {
    const g = r.id === 'tostadas-casa' ? 'Tu desayuno' : (r.group ?? MEAL_LABEL[r.meal[0]])
    groups.set(g, [...(groups.get(g) ?? []), r])
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="display text-[30px] leading-tight font-semibold md:text-4xl">Recetas</h1>
      <p className="mt-1 text-muted">
        {list.length} recetas de {plan.name}
      </p>

      <label className="mt-5 flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4">
        <Search className="size-4 text-muted" />
        <span className="sr-only">Buscar receta</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: salmón, crema, pizza…" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
      </label>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <Press
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={f === filter}
            className={`relative h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${f === filter ? 'text-on-accent' : 'bg-surface text-muted'}`}
          >
            {f === filter && <motion.span layoutId="filter-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative">{f === 'todas' ? 'Todas' : MEAL_LABEL[f]}</span>
          </Press>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {[...groups.entries()].map(([g, rs]) => (
          <motion.section key={g} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-7">
            <h2 className="display mb-3 text-lg font-semibold">{g}</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {rs.map((r) => {
                const m = macrosOf(recipeIngs(state, plan, r).ings, state)
                return (
                  <motion.li key={r.id} layout transition={spring}>
                    <Press
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openRecipe(plan.id, r.id)}
                      className="flex h-full w-full items-center gap-4 rounded-3xl border border-line bg-surface p-3 text-left"
                    >
                      <Dish src={r.img} m={m} size={76} />
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug font-medium text-balance">{r.name}</span>
                        <MacroChips m={m} className="mt-2" />
                        {r.yields && <span className="mt-1 block text-[13px] text-muted">{r.yields}</span>}
                      </span>
                    </Press>
                  </motion.li>
                )
              })}
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
      {list.length === 0 && <p className="mt-10 text-center text-muted">Ninguna receta coincide. Prueba con un ingrediente.</p>}
    </div>
  )
}
