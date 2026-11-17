import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// URL y clave pública (anon) del proyecto: van en app/.env.production (son públicas por diseño;
// lo que protege los datos son las reglas RLS de supabase/plato.sql).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Error que trae la dirección al volver de un enlace de correo caducado o ya usado */
export const linkError: string | null = (() => {
  const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1))
  const code = params.get('error_code') ?? params.get('error')
  if (!code) return null
  history.replaceState(null, '', location.pathname)
  return code === 'otp_expired'
    ? 'El enlace del correo ha caducado o ya se usó. Escribe tu correo y te enviamos uno nuevo.'
    : 'No se pudo usar el enlace del correo. Escribe tu correo y te enviamos uno nuevo.'
})()

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

export const MEDIA_BUCKET = 'plato-media'
