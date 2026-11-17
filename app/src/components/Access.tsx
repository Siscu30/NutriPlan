import { motion } from 'motion/react'
import { Check, KeyRound, LogOut, ShieldCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PersonId } from '../data/types'
import { listProfiles, signOut, updateProfile, useAuth, type Profile } from '../lib/auth'
import { useStore } from '../lib/store'
import { NewPassword } from './AuthGate'
import { Press, spring } from './ui'

const PEOPLE: PersonId[] = ['fran', 'lua']

/** Mi cuenta: cambiar contraseña y salir */
export function AccountSection() {
  const { profile } = useAuth()
  const [changing, setChanging] = useState(false)
  const [done, setDone] = useState(false)
  if (!profile) return null
  return (
    <section className="mt-7">
      <h3 className="display text-lg font-semibold">Tu cuenta</h3>
      <p className="mt-1 text-sm text-muted">
        {profile.name || profile.email} · {profile.email}
        {profile.role === 'admin' && ' · administrador'}
      </p>
      {changing ? (
        <div className="mt-3 rounded-3xl bg-surface p-4">
          <NewPassword
            onDone={() => {
              setChanging(false)
              setDone(true)
            }}
          />
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Press onClick={() => setChanging(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold">
            <KeyRound className="size-4" /> {done ? 'Contraseña cambiada' : 'Cambiar contraseña'}
          </Press>
          <Press onClick={() => signOut()} className="flex h-12 items-center gap-2 rounded-2xl bg-surface px-4 text-sm font-semibold">
            <LogOut className="size-4" /> Salir
          </Press>
        </div>
      )}
    </section>
  )
}

/** Panel del administrador: aprobar solicitudes y decidir qué planes ve cada uno */
export function AccessAdmin() {
  const { profile } = useAuth()
  const [list, setList] = useState<Profile[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    listProfiles()
      .then(setList)
      .catch((e: Error) => setError(e.message))
  useEffect(() => {
    if (profile?.role === 'admin') void load()
  }, [profile?.role])

  if (profile?.role !== 'admin') return null
  const pending = list?.filter((p) => p.status === 'pending') ?? []
  const others = list?.filter((p) => p.status !== 'pending') ?? []

  return (
    <section className="mt-7">
      <h3 className="display flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="size-4" /> Accesos
        {pending.length > 0 && <span className="rounded-full bg-prot px-2 py-0.5 text-xs text-white">{pending.length}</span>}
      </h3>
      <p className="mt-1 text-sm text-muted">Nadie entra sin tu aprobación. Elige qué planes ve cada persona.</p>
      {error && <p className="mt-2 text-sm text-prot">{error}</p>}
      {!list && !error && <p className="mt-3 text-sm text-muted">Cargando…</p>}
      {list && pending.length === 0 && <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">No hay solicitudes pendientes.</p>}
      <ul className="mt-3 space-y-2">
        {[...pending, ...others].map((p) => (
          <AccessRow key={p.id} p={p} self={p.id === profile.id} onSaved={load} />
        ))}
      </ul>
    </section>
  )
}

function AccessRow({ p, self, onSaved }: { p: Profile; self: boolean; onSaved: () => void }) {
  const names = useStore((s) => s.shared.names)
  const [view, setView] = useState<PersonId[]>(p.can_view.length ? p.can_view : p.person ? [p.person] : [])
  const [person, setPerson] = useState<PersonId | null>(p.person)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const changed = view.join() !== p.can_view.join() || person !== p.person

  const save = async (status: Profile['status']) => {
    setBusy(true)
    const err = await updateProfile(p.id, { status, can_view: status === 'approved' ? view : [], person })
    setBusy(false)
    setMsg(err)
    if (!err) onSaved()
  }
  const toggle = (id: PersonId) => setView((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  return (
    <li className={`rounded-3xl border bg-surface p-4 ${p.status === 'pending' ? 'border-carb' : 'border-line'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name || p.email}</p>
          <p className="truncate text-[13px] text-muted">{p.email}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            p.status === 'approved' ? 'bg-veg/15 text-veg' : p.status === 'pending' ? 'bg-carb/15 text-carb' : 'bg-prot/12 text-prot'
          }`}
        >
          {p.role === 'admin' ? 'Admin' : p.status === 'approved' ? 'Aprobado' : p.status === 'pending' ? 'Pendiente' : 'Sin acceso'}
        </span>
      </div>

      <fieldset className="mt-3">
        <legend className="mb-1.5 text-[13px] text-muted">Su plan</legend>
        <div className="flex gap-2">
          {PEOPLE.map((id) => (
            <Press key={id} onClick={() => setPerson(id)} aria-pressed={person === id} className={`relative h-9 flex-1 rounded-xl text-sm font-semibold ${person === id ? 'text-on-accent' : 'bg-surface-2'}`}>
              {person === id && <motion.span layoutId={`own-${p.id}`} transition={spring} className="absolute inset-0 rounded-xl bg-accent" />}
              <span className="relative">{names[id]}</span>
            </Press>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="mb-1.5 text-[13px] text-muted">Puede ver y editar</legend>
        <div className="flex gap-2">
          {PEOPLE.map((id) => (
            <label key={id} className={`flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold ${view.includes(id) ? 'bg-veg/15 text-veg' : 'bg-surface-2 text-muted'}`}>
              <input type="checkbox" className="sr-only" checked={view.includes(id)} onChange={() => toggle(id)} disabled={self && id === 'fran'} />
              {view.includes(id) && <Check className="size-3.5" />} Plan de {names[id]}
            </label>
          ))}
        </div>
      </fieldset>

      {msg && <p className="mt-2 text-sm text-prot">{msg}</p>}
      <div className="mt-3 flex gap-2">
        {p.status !== 'approved' ? (
          <>
            <Press disabled={busy || view.length === 0} onClick={() => save('approved')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-semibold text-on-accent disabled:opacity-50">
              <Check className="size-4" /> Aprobar
            </Press>
            {p.status === 'pending' && (
              <Press disabled={busy} onClick={() => save('rejected')} className="h-11 rounded-2xl bg-surface-2 px-4 text-sm font-semibold">
                Rechazar
              </Press>
            )}
          </>
        ) : (
          <>
            <Press disabled={busy || !changed || view.length === 0} onClick={() => save('approved')} className="h-11 flex-1 rounded-2xl bg-accent text-sm font-semibold text-on-accent disabled:opacity-40">
              Guardar cambios
            </Press>
            {!self && (
              <Press disabled={busy} onClick={() => save('rejected')} className="flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-4 text-sm font-semibold text-prot">
                <UserX className="size-4" /> Quitar acceso
              </Press>
            )}
          </>
        )}
      </div>
    </li>
  )
}
