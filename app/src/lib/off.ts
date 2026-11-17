import type { Food } from '../data/foods'

// Búsqueda de productos de marca en Open Food Facts (base de datos abierta).
interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string
  nutriments?: Record<string, number | undefined>
}

export async function searchOff(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.search = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
    lc: 'es',
    cc: 'es',
    fields: 'code,product_name,product_name_es,brands,nutriments',
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const data = (await res.json()) as { products?: OffProduct[] }
  return (data.products ?? [])
    .map((p): Food | null => {
      const n = p.nutriments ?? {}
      const k = n['energy-kcal_100g']
      const name = p.product_name_es || p.product_name
      if (!name || k == null) return null
      return {
        id: `off-${p.code}`,
        n: p.brands ? `${name} · ${p.brands.split(',')[0]}` : name,
        k: Math.round(k),
        p: n.proteins_100g ?? 0,
        c: n.carbohydrates_100g ?? 0,
        f: n.fat_100g ?? 0,
        cat: 'otros',
        custom: true,
      }
    })
    .filter((f): f is Food => !!f)
}
