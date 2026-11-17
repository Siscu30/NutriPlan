import { motion } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { usePageViewer } from '../components/PageViewer'
import { Press, spring } from '../components/ui'
import { activePlan, useStore } from '../lib/store'

const TONE = { veg: 'var(--veg)', carb: 'var(--carb)', prot: 'var(--prot)', fat: 'var(--fat)' }

export function Guia({ date }: { date: string }) {
  const state = useStore((s) => s)
  const plan = activePlan(state, state.person, date)
  const openPages = usePageViewer()

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="display text-[30px] leading-tight font-semibold md:text-4xl">Guía de la nutricionista</h1>
      <p className="mt-1 max-w-prose text-muted">Las reglas de {plan.name} para montar cualquier plato fuera del menú.</p>

      {plan.pages && plan.pages.length > 0 && (
        <Press onClick={() => openPages(plan.pages!, 0, plan.name)} className="mt-4 flex h-11 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-on-accent">
          <BookOpen className="size-4" /> Ver el plan completo ({plan.pages.length} páginas)
        </Press>
      )}

      <div className="mt-8 space-y-5">
        {plan.guide.map((s, i) => (
          <motion.section
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ ...spring, delay: i * 0.03 }}
            className="rounded-[28px] border border-line bg-surface p-5 md:p-6"
          >
            <h2 className="display flex items-center gap-2.5 text-xl font-semibold">
              <span className="size-3 rounded-full" style={{ background: TONE[s.tone] }} />
              {s.title}
            </h2>
            {s.img && <img src={s.img} alt={`Ilustración: ${s.title}`} loading="lazy" className="mx-auto mt-4 w-full max-w-sm rounded-2xl bg-white" />}
            {s.intro && <p className="mt-3 max-w-prose leading-relaxed text-muted">{s.intro}</p>}
            {s.bullets && (
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 leading-relaxed">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="no-scrollbar -mx-5 mt-4 overflow-x-auto px-5">
                <table className="w-full min-w-[520px] text-left text-[15px]">
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h} className="pb-2 text-sm font-semibold text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.table.rows.map((r) => (
                      <tr key={r.join()}>
                        {r.map((c, j) => (
                          <td key={j} className={`py-2.5 pr-4 align-top ${j === 0 ? 'font-medium' : ''}`}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.pages && s.pages.length > 0 && (
              <div className="no-scrollbar -mx-5 mt-5 flex gap-3 overflow-x-auto px-5">
                {s.pages.map((p, j) => (
                  <Press key={p} whileHover={{ y: -3 }} onClick={() => openPages(s.pages!, j, s.title)} className="shrink-0" aria-label={`Ver página original ${j + 1} de ${s.title}`}>
                    <img src={p} alt="" loading="lazy" className="h-44 w-auto rounded-xl border border-line bg-white shadow-soft" />
                  </Press>
                ))}
              </div>
            )}
          </motion.section>
        ))}
      </div>
    </div>
  )
}
