import { motion } from 'motion/react'
import { Cloud, CloudOff, FileUp, KeyRound, Trash2, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { AccessAdmin, AccountSection } from './Access'
import { useState } from 'react'
import { Drawer } from 'vaul'
import type { PersonId, PlanDoc } from '../data/types'
import { mondayOf, shortDate, today } from '../lib/dates'
import { actions, activePlan, plansOf, useStore } from '../lib/store'
import { Press, spring } from './ui'

const ALL: PersonId[] = ['fran', 'lua']

export function Settings({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: () => void }) {
  const state = useStore((s) => s)
  const { profile } = useAuth()
  const PEOPLE = ALL.filter((p) => profile?.can_view.includes(p))
  const [confirm, setConfirm] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const t = today()

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-xl flex-col rounded-t-[32px] border border-line bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-surface-2" />
          <div className="no-scrollbar overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
            <div className="flex items-center justify-between pt-4 pb-4">
              <Drawer.Title className="display text-2xl font-semibold">Planes y ajustes</Drawer.Title>
              <Press onClick={onClose} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-surface">
                <X className="size-5" />
              </Press>
            </div>

            <SyncLine status={state.sync.status} message={state.sync.message} />

            <Press onClick={onImport} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-on-accent">
              <FileUp className="size-5" /> Añadir un plan nuevo (PDF)
            </Press>

            {PEOPLE.map((p) => {
              const plans = plansOf(state, p)
              const current = activePlan(state, p, t)
              return (
                <section key={p} className="mt-7">
                  <h3 className="display text-lg font-semibold">Planes de {state.shared.names[p]}</h3>
                  <ul className="mt-3 space-y-2">
                    {plans.map((plan) => (
                      <PlanRow
                        key={plan.id}
                        plan={plan}
                        active={plan.id === current.id}
                        confirming={confirm === plan.id}
                        onDelete={() => {
                          if (confirm === plan.id) {
                            actions.deletePlan(plan)
                            setConfirm(null)
                          } else setConfirm(plan.id)
                        }}
                        canDelete={plans.length > 1}
                      />
                    ))}
                  </ul>
                  <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium">Desayuno de casa</span>
                      <span className="block text-[13px] text-muted">Dos tostadas cada día en lugar del desayuno del plan</span>
                    </span>
                    <Switch on={state.people[p].houseBreakfast} onChange={(v) => actions.setHouseBreakfast(p, v)} label={`Desayuno de casa de ${state.shared.names[p]}`} />
                  </label>
                </section>
              )
            })}

            <section className="mt-7 space-y-3">
              <h3 className="display text-lg font-semibold">Nombres</h3>
              {PEOPLE.map((p) => (
                <label key={p} className="block">
                  <span className="sr-only">Nombre</span>
                  <input
                    value={state.shared.names[p]}
                    onChange={(e) => actions.setName(p, e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-carb"
                  />
                </label>
              ))}
            </section>

            <AccountSection />
            <AccessAdmin />

            <section className="mt-7">
              <h3 className="display flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="size-4" /> Clave de Claude
              </h3>
              <p className="mt-1 text-sm text-muted">Se usa solo para leer los PDF nuevos. Se guarda únicamente en este dispositivo, nunca en la nube.</p>
              <div className="mt-2 flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  value={state.apiKey}
                  onChange={(e) => actions.setApiKey(e.target.value.trim())}
                  placeholder="sk-ant-…"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-carb"
                />
                <Press onClick={() => setShowKey((v) => !v)} className="h-12 rounded-2xl bg-surface px-4 text-sm font-semibold">
                  {showKey ? 'Ocultar' : 'Ver'}
                </Press>
              </div>
            </section>

            <section className="mt-7">
              <h3 className="display text-lg font-semibold">Empezar de cero</h3>
              <p className="mt-1 text-sm text-muted">Borra los cambios de platos y las comidas marcadas de {state.shared.names[state.person]}. Los planes se mantienen.</p>
              <Press
                onClick={() => {
                  if (confirm === 'reset') {
                    actions.resetPerson(state.person)
                    setConfirm(null)
                  } else setConfirm('reset')
                }}
                className={`mt-2 h-12 w-full rounded-2xl font-semibold ${confirm === 'reset' ? 'bg-prot text-white' : 'bg-surface text-prot'}`}
              >
                {confirm === 'reset' ? 'Pulsa otra vez para borrar' : `Borrar cambios de ${state.shared.names[state.person]}`}
              </Press>
            </section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function PlanRow({ plan, active, confirming, onDelete, canDelete }: { plan: PlanDoc; active: boolean; confirming: boolean; onDelete: () => void; canDelete: boolean }) {
  return (
    <li className={`rounded-2xl border p-3 ${active ? 'border-carb bg-surface' : 'border-line bg-surface'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {plan.name}
            {active && <span className="ml-2 rounded-full bg-carb/15 px-2 py-0.5 text-[11px] font-semibold text-carb">En uso</span>}
          </p>
          <p className="text-[13px] text-muted">
            {plan.weeks.length} semanas · {plan.recipes.length} recetas · {plan.source === 'seed' ? 'del PDF de noviembre' : 'importado'}
          </p>
        </div>
        {canDelete && (
          <Press onClick={onDelete} aria-label={`Borrar ${plan.name}`} className={`grid h-9 shrink-0 place-items-center rounded-full px-3 text-sm font-semibold ${confirming ? 'bg-prot text-white' : 'bg-surface-2'}`}>
            {confirming ? 'Borrar' : <Trash2 className="size-4" />}
          </Press>
        )}
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-muted">Empieza el lunes</span>
        <input
          type="date"
          value={plan.startDate}
          onChange={(e) => e.target.value && actions.setPlanStart(plan, mondayOf(e.target.value))}
          className="h-9 rounded-xl border border-line bg-bg px-2 text-sm outline-none focus:border-carb"
        />
        <span className="text-muted">({shortDate(plan.startDate)})</span>
      </label>
    </li>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-veg' : 'bg-surface-2'}`}>
      <motion.span layout transition={spring} className="absolute top-1 size-6 rounded-full bg-white shadow" style={{ left: on ? 28 : 4 }} />
    </button>
  )
}

function SyncLine({ status, message }: { status: string; message?: string }) {
  const ok = status === 'ok'
  const text =
    status === 'ok' ? 'Sincronizado entre vuestros dispositivos' : status === 'connecting' ? 'Conectando con la nube…' : status === 'error' ? (message ?? 'No se pudo sincronizar') : 'Sin sincronizar'
  return (
    <p className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${ok ? 'bg-veg/15 text-veg' : 'bg-surface-2 text-muted'}`}>
      {ok ? <Cloud className="size-4" /> : <CloudOff className="size-4" />} {text}
    </p>
  )
}
