import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// URL y clave pública (anon) del proyecto: van en app/.env.production (son públicas por diseño;
// lo que protege los datos son las reglas RLS de supabase/plato.sql).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

export const MEDIA_BUCKET = 'plato-media'
