import { AnimatePresence, motion } from 'motion/react'
import { Clock, Eye, EyeOff, LockKeyhole, LogOut, ShieldX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { changePassword, refreshProfile, requestAccess, sendRecovery, signIn, signOut, useAuth } from '../lib/auth'
import { actions, getState } from '../lib/store'
import { startSync, stopSync } from '../lib/sync'
import { linkError, supabase } from '../lib/supabase'
import { DEMO } from '../lib/demo'
import { Press, spring } from './ui'

/** Solo deja pasar a usuarios aprobados; muestra el resto de pantallas de acceso */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const p = auth.profile
  const approved = !!p && p.status === 'approved' && !p.must_change_password && !auth.recovery
  const view = p?.can_view.join(',') ?? ''

  useEffect(() => {
    if (DEMO) return
    if (!approved || !p) {
      // Pantallas de acceso con el color por defecto
      delete document.documentElement.dataset.person
      stopSync()
      return
    }
    // Si el plan seleccionado no está permitido, pasa al primero que sí lo esté
    if (!p.can_view.includes(getState().person)) actions.setPerson(p.person && p.can_view.includes(p.person) ? p.person : p.can_view[0])
    startSync(p.can_view)
    return () => stopSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, view])

  let screen: ReactNode = null
  let key = 'app'
  if (!supabase) [screen, key] = [<NotConfigured />, 'config']
  else if (!auth.ready) [screen, key] = [<Splash />, 'splash']
  else if (!auth.session) [screen, key] = [<Login />, 'login']
  else if (auth.recovery || p?.must_change_password) [screen, key] = [<NewPassword first={!!p?.must_change_password} />, 'password']
  else if (!p) [screen, key] = [<Problem text={auth.error ?? 'No encontramos tu perfil.'} />, 'problem']
  else if (p.status === 'pending') [screen, key] = [<Pending email={p.email} />, 'pending']
  else if (p.status === 'rejected') [screen, key] = [<Problem icon={<ShieldX className="size-7" />} text="El administrador no ha aprobado este acceso." />, 'rejected']
  else if (p.can_view.length === 0) [screen, key] = [<Problem text="Tu acceso está aprobado, pero aún no tienes ningún plan asignado. Pídeselo al administrador." />, 'noplans']

  if (DEMO || (approved && p.can_view.length > 0)) return <>{children}</>
  return (
    <div className="pt-safe flex min-h-dvh items-center justify-center px-5 py-10">
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={spring} className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-16 rounded-[20px] shadow-soft" />
            <span className="display text-3xl font-semibold">Plato</span>
          </div>
          {screen}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Splash() {
  return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="mx-auto size-8 rounded-full border-4 border-carb border-t-transparent" aria-label="Cargando" />
}

function Field({ label, type = 'text', value, onChange, autoComplete }: { label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <span className="relative block">
        <input
          type={isPass && show ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 pr-12 text-base outline-none focus:border-carb"
        />
        {isPass && (
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
    </label>
  )
}

function Submit({ children, busy, disabled }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return (
    <Press type="submit" disabled={busy || disabled} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-semibold text-on-accent disabled:opacity-50">
      {busy && <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} className="size-4 rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </Press>
  )
}

const Msg = ({ text, ok }: { text: string | null; ok?: boolean }) =>
  text ? (
    <p role={ok ? 'status' : 'alert'} className={`rounded-2xl px-4 py-3 text-sm ${ok ? 'bg-veg/15 text-veg' : 'bg-prot/12 text-prot'}`}>
      {text}
    </p>
  ) : null

type Mode = 'login' | 'request' | 'recover'
function Login() {
  const [mode, setMode] = useState<Mode>(linkError ? 'recover' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(linkError ? { text: linkError } : null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    if (mode === 'login') {
      const err = await signIn(email, password)
      if (err) setMsg({ text: err })
    } else if (mode === 'request') {
      if (password.length < 10) setMsg({ text: 'Usa una contraseña de al menos 10 caracteres.' })
      else {
        const r = await requestAccess(name, email, password)
        if (r.error) setMsg({ text: r.error })
        else if (r.needsConfirm) setMsg({ text: 'Te hemos enviado un correo para confirmar tu dirección. Después, el administrador revisará tu solicitud.', ok: true })
      }
    } else {
      const err = await sendRecovery(email)
      setMsg(err ? { text: err } : { text: 'Si el correo existe, te llegará un enlace para crear una contraseña nueva.', ok: true })
    }
    setBusy(false)
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'login', label: 'Entrar' },
    { id: 'request', label: 'Pedir acceso' },
  ]
  return (
    <form onSubmit={submit} className="space-y-4">
      {mode !== 'recover' && (
        <div role="tablist" className="flex rounded-full border border-line bg-surface p-1">
          {tabs.map((t) => (
            <Press key={t.id} role="tab" aria-selected={mode === t.id} onClick={() => { setMode(t.id); setMsg(null) }} className={`relative h-10 flex-1 rounded-full text-sm font-semibold ${mode === t.id ? 'text-on-accent' : 'text-muted'}`}>
              {mode === t.id && <motion.span layoutId="auth-tab" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
              <span className="relative">{t.label}</span>
            </Press>
          ))}
        </div>
      )}
      {mode === 'recover' && <h1 className="display text-2xl font-semibold">{linkError ? 'Pide un enlace nuevo' : 'Recuperar contraseña'}</h1>}
      {mode === 'recover' && <p className="text-sm text-muted">Te llegará un correo; el enlace abre Plato para que crees tu contraseña. Caduca en 24 horas.</p>}
      {mode === 'request' && <p className="text-sm text-muted">Tu solicitud quedará pendiente hasta que el administrador la apruebe.</p>}
      {mode === 'request' && <Field label="Nombre" value={name} onChange={setName} autoComplete="name" />}
      <Field label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" />
      {mode !== 'recover' && <Field label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />}
      <Msg text={msg?.text ?? null} ok={msg?.ok} />
      <Submit busy={busy} disabled={!email || (mode !== 'recover' && !password) || (mode === 'request' && !name)}>
        {mode === 'login' ? 'Entrar' : mode === 'request' ? 'Pedir acceso' : 'Enviar enlace'}
      </Submit>
      <button type="button" onClick={() => { setMode(mode === 'recover' ? 'login' : 'recover'); setMsg(null) }} className="w-full cursor-pointer py-2 text-sm font-semibold text-muted">
        {mode === 'recover' ? 'Volver a entrar' : 'He olvidado mi contraseña'}
      </button>
    </form>
  )
}

export function NewPassword({ first, onDone }: { first?: boolean; onDone?: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (a.length < 10) return setMsg('Usa al menos 10 caracteres.')
    if (a !== b) return setMsg('Las dos contraseñas no coinciden.')
    setBusy(true)
    const err = await changePassword(a)
    setBusy(false)
    if (err) setMsg(err)
    else onDone?.()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-carb/15 text-carb">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="display text-2xl font-semibold">{first ? 'Crea tu contraseña' : 'Contraseña nueva'}</h1>
      </div>
      {first && <p className="text-sm text-muted">Has entrado con una contraseña temporal. Cámbiala para seguir.</p>}
      <Field label="Contraseña nueva (mínimo 10 caracteres)" type="password" value={a} onChange={setA} autoComplete="new-password" />
      <Field label="Repítela" type="password" value={b} onChange={setB} autoComplete="new-password" />
      <Msg text={msg} />
      <Submit busy={busy} disabled={!a || !b}>
        Guardar contraseña
      </Submit>
      {first && (
        <button type="button" onClick={() => signOut()} className="w-full cursor-pointer py-2 text-sm font-semibold text-muted">
          Salir
        </button>
      )}
    </form>
  )
}

function Pending({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-carb/15 text-carb">
        <Clock className="size-7" />
      </span>
      <h1 className="display text-2xl font-semibold">Pendiente de aprobación</h1>
      <p className="text-muted">Tu solicitud con {email} está esperando a que el administrador la apruebe.</p>
      <Press
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await refreshProfile()
          setBusy(false)
        }}
        className="h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-50"
      >
        {busy ? 'Comprobando…' : 'Comprobar de nuevo'}
      </Press>
      <SignOutButton />
    </div>
  )
}

function Problem({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="space-y-4 text-center">
      {icon && <span className="mx-auto grid size-14 place-items-center rounded-full bg-prot/12 text-prot">{icon}</span>}
      <p className="text-muted">{text}</p>
      <SignOutButton />
    </div>
  )
}

function SignOutButton() {
  return (
    <Press onClick={() => signOut()} className="mx-auto flex h-11 items-center gap-2 rounded-2xl bg-surface px-5 text-sm font-semibold">
      <LogOut className="size-4" /> Salir
    </Press>
  )
}

function NotConfigured() {
  return <p className="text-center text-muted">Falta conectar la app con Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en app/.env.production).</p>
}
