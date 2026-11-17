// Sesión, perfil y administración de accesos.
import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import type { PersonId } from '../data/types'
import { supabase } from './supabase'

export interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  person: PersonId | null
  can_view: PersonId[]
  must_change_password: boolean
  created_at: string
}

export interface AuthState {
  ready: boolean
  session: Session | null
  profile: Profile | null
  /** Ha llegado desde el correo de "recuperar contraseña" */
  recovery: boolean
  error?: string
}

let state: AuthState = { ready: !supabase, session: null, profile: null, recovery: false }
const listeners = new Set<() => void>()
const set = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
export const getAuth = () => state

async function loadProfile(session: Session | null) {
  if (!supabase || !session) return set({ ready: true, session, profile: null })
  const { data, error } = await supabase.from('plato_profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (error) return set({ ready: true, session, profile: null, error: 'No se pudo cargar tu perfil. Revisa la conexión.' })
  set({ ready: true, session, profile: (data as Profile) ?? null, error: undefined })
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => loadProfile(data.session))
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') set({ recovery: true })
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
      setTimeout(() => loadProfile(session), 0)
    }
  })
}

const MSG: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo con el enlace que te hemos enviado y vuelve a entrar.',
  'User already registered': 'Ese correo ya tiene una cuenta. Entra con tu contraseña.',
  'New password should be different from the old password.': 'La nueva contraseña tiene que ser distinta de la anterior.',
}
const tr = (m: string) =>
  MSG[m] ??
  (/fetch|network|Load failed/i.test(m) ? 'No hay conexión con el servidor. Revisa internet y vuelve a intentarlo.' : null) ??
  (m.includes('Password should') ? 'La contraseña no cumple los requisitos de seguridad (mínimo 10 caracteres).' : m)

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase.'
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  return error ? tr(error.message) : null
}

export async function requestAccess(name: string, email: string, password: string): Promise<{ error: string | null; needsConfirm: boolean }> {
  if (!supabase) return { error: 'Falta configurar Supabase.', needsConfirm: false }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: location.origin + location.pathname },
  })
  if (error) return { error: tr(error.message), needsConfirm: false }
  return { error: null, needsConfirm: !data.session }
}

export async function sendRecovery(email: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase.'
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname })
  return error ? tr(error.message) : null
}

export async function changePassword(password: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase.'
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return tr(error.message)
  await supabase.rpc('plato_password_changed')
  set({ recovery: false })
  await loadProfile((await supabase.auth.getSession()).data.session)
  return null
}

export async function signOut() {
  await supabase?.auth.signOut()
  set({ session: null, profile: null, recovery: false })
}

export const refreshProfile = async () => supabase && loadProfile((await supabase.auth.getSession()).data.session)

// ───────── administración ─────────
export async function listProfiles(): Promise<Profile[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('plato_profiles').select('*').order('created_at')
  if (error) throw new Error('No se pudieron cargar los accesos.')
  return data as Profile[]
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'status' | 'person' | 'can_view' | 'role'>>): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase.'
  const { error } = await supabase.from('plato_profiles').update(patch).eq('id', id)
  return error ? 'No se pudo guardar el cambio.' : null
}
