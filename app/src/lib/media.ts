// Fotos y páginas privadas: las rutas "sb:<ruta>" se convierten en enlaces firmados de Supabase Storage.
import { useEffect, useState } from 'react'
import { MEDIA_BUCKET, supabase } from './supabase'

const PREFIX = 'sb:'
const TTL = 60 * 60 * 24 * 7 // 7 días
const KEY = 'plato.media'

type Entry = { url: string; exp: number }
let cache: Record<string, Entry> = {}
try {
  cache = JSON.parse(localStorage.getItem(KEY) ?? '{}')
} catch {
  cache = {}
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* sin almacenamiento */
  }
}

export const isPrivate = (src?: string) => !!src && src.startsWith(PREFIX)

let pending = new Map<string, ((url: string | undefined) => void)[]>()
let timer: ReturnType<typeof setTimeout> | null = null

/** Agrupa las peticiones de un mismo momento en una sola llamada a Supabase */
async function flush() {
  timer = null
  const batch = pending
  pending = new Map()
  if (!supabase) return batch.forEach((cbs) => cbs.forEach((cb) => cb(undefined)))
  const paths = [...batch.keys()]
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, TTL)
  const now = Date.now()
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) cache[row.path] = { url: row.signedUrl, exp: now + (TTL - 3600) * 1000 }
  }
  save()
  batch.forEach((cbs, p) => cbs.forEach((cb) => cb(cache[p]?.url)))
}

export function resolveMedia(src?: string): Promise<string | undefined> {
  if (!src || !isPrivate(src)) return Promise.resolve(src)
  const path = src.slice(PREFIX.length)
  const hit = cache[path]
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url)
  return new Promise((resolve) => {
    pending.set(path, [...(pending.get(path) ?? []), resolve])
    if (!timer) timer = setTimeout(flush, 30)
  })
}

export function useMedia(src?: string): string | undefined {
  const cached = (() => {
    if (!src || !isPrivate(src)) return src
    const hit = cache[src.slice(PREFIX.length)]
    return hit && hit.exp > Date.now() ? hit.url : undefined
  })()
  const [url, setUrl] = useState<string | undefined>(cached)
  useEffect(() => {
    let alive = true
    if (cached) setUrl(cached)
    else resolveMedia(src).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [src, cached])
  return url
}
