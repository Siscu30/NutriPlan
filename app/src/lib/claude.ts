// Convierte las páginas de un plan en datos estructurados con Claude (desde el navegador, con la clave del usuario).
import Anthropic from '@anthropic-ai/sdk'
import { BASE_FOODS, type FoodCat } from '../data/foods'
import type { Meal, PersonId } from '../data/types'
import type { PdfPage } from './pdf'

export interface ParsedPlan {
  name: string
  notes: string[]
  weeks: { desayuno: string[]; comida: string[]; merienda: string[]; cena: string[] }[][]
  recipes: {
    id: string
    name: string
    meal: Meal[]
    group: string
    ing: { f: string; g: number; t: string }[]
    steps: string[]
    note: string
    yields: string
    photo: string
    photoBox: number[]
    page: number
  }[]
  foods: { id: string; n: string; k: number; p: number; c: number; f: number; cat: FoodCat }[]
  guide: { title: string; intro: string; bullets: string[]; tone: 'veg' | 'carb' | 'prot' | 'fat'; pages: number[] }[]
}

const str = { type: 'string' }
const strs = { type: 'array', items: str }
const obj = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const DAY = obj({ desayuno: strs, comida: strs, merienda: strs, cena: strs })
const SCHEMA = obj({
  name: str,
  notes: strs,
  weeks: { type: 'array', items: { type: 'array', items: DAY } },
  recipes: {
    type: 'array',
    items: obj({
      id: str,
      name: str,
      meal: { type: 'array', items: { type: 'string', enum: ['desayuno', 'comida', 'merienda', 'cena', 'extra'] } },
      group: str,
      ing: { type: 'array', items: obj({ f: str, g: { type: 'number' }, t: str }) },
      steps: strs,
      note: str,
      yields: str,
      photo: str,
      photoBox: { type: 'array', items: { type: 'number' } },
      page: { type: 'integer' },
    }),
  },
  foods: {
    type: 'array',
    items: obj({
      id: str,
      n: str,
      k: { type: 'number' },
      p: { type: 'number' },
      c: { type: 'number' },
      f: { type: 'number' },
      cat: { type: 'string', enum: ['hidrato', 'proteina', 'verdura', 'fruta', 'lacteo', 'grasa', 'otros'] },
    }),
  },
  guide: {
    type: 'array',
    items: obj({ title: str, intro: str, bullets: strs, tone: { type: 'string', enum: ['veg', 'carb', 'prot', 'fat'] }, pages: { type: 'array', items: { type: 'integer' } } }),
  },
})

const SYSTEM = `Eres un asistente que convierte el plan de una nutricionista (PDF en español) en datos para una app de cocina.
Recibes cada página como imagen, su texto con la posición vertical [y0-1000] y las fotos detectadas con su caja (x0,y0,x1,y1 en 0-1000).

Reglas:
- Copia los nombres, cantidades y pasos tal como aparecen en el PDF. No inventes pasos. Los pasos van en frases cortas, en orden.
- Cantidades por ración para esta persona. Si la receta es para varias raciones ("PARA 4", "2 RACIONES"), divide los ingredientes entre las raciones y pon el rendimiento en "yields" (por ejemplo "Para 4").
- Si un plato del menú no indica cantidades, usa las de la tabla "Montar el plato" / guía de la nutricionista (hidratos, proteína, verduras, grasas) y explícalo en "note". Si tampoco hay guía, pon una cantidad razonable y dilo en "note".
- Ingredientes: "f" es el id de un alimento de la lista que se te da. Si no existe ninguno adecuado, crea uno en "foods" con un id nuevo en minúsculas-con-guiones y sus valores por 100 g (kcal, proteína, hidratos disponibles, grasa) según tablas BEDCA/USDA. "g" en gramos (o ml); "t" es el texto original de la cantidad o la alternativa (por ejemplo "2 cdas" o "o 40 g de pavo"); vacío si no hace falta.
- "id" de receta: minúsculas-con-guiones, único. "meal": comidas en las que encaja; usa "extra" para recetas sueltas (pizzas, cremas, dulces, pre-entreno).
- "photo": id de la foto detectada que muestra ese plato (la que está junto a su título). Cadena vacía si no hay.
- "photoBox": solo si el plato tiene foto en la página pero no aparece entre las fotos detectadas (por ejemplo, páginas escaneadas): su caja [x0, y0, x1, y1] en coordenadas 0-1000 de esa página. Lista vacía en los demás casos.
- "page": número de página donde está la receta.
- "weeks": si hay tablas de menú semanal (TOMA / DÍA 1…7), crea una semana por tabla con 7 días; cada comida es una lista de ids de receta (puede tener dos, por ejemplo crema + tosta). Si el menú no incluye merienda, reparte las opciones de merienda del plan entre los días. Si no hay menú semanal, deja una sola semana repitiendo las opciones principales.
- Todo plato que aparezca en el menú debe existir en "recipes".
- "guide": secciones de reglas generales (método del plato, montar el plato, equivalencias, grasas, pre-entreno, hidratación…) con sus páginas.
- "notes": notas generales del menú (por ejemplo "¼ de plato de hidratos…").
- "name": nombre corto del plan (por ejemplo "Plan Diciembre").`

export async function parsePlanWithClaude(opts: {
  apiKey: string
  person: PersonId
  personName: string
  pages: PdfPage[]
  onProgress: (chars: number) => void
  signal?: AbortSignal
}): Promise<ParsedPlan> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })
  const foodList = Object.values(BASE_FOODS)
    .map((f) => `${f.id}: ${f.n}`)
    .join('\n')

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const p of opts.pages) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.jpeg } })
    const fotos = p.photos.map((f) => `${f.id}: [${f.box.join(', ')}]`).join('; ') || 'ninguna'
    content.push({ type: 'text', text: `Página ${p.n}. Fotos detectadas: ${fotos}\nTexto:\n${p.text || '(sin texto: léelo de la imagen)'}` })
  }
  content.push({
    type: 'text',
    text: `Este plan es de ${opts.personName}. Alimentos disponibles (id: nombre):\n${foodList}\n\nDevuelve el plan completo en el formato indicado.`,
  })

  const stream = client.beta.messages.stream(
    {
      model: 'claude-opus-5-5',
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    },
    { signal: opts.signal },
  )
  let chars = 0
  stream.on('text', (t) => {
    chars += t.length
    opts.onProgress(chars)
  })
  const msg = await stream.finalMessage()
  if (msg.stop_reason === 'refusal') throw new Error('Claude no ha podido procesar este PDF. Prueba de nuevo o con otro archivo.')
  if (msg.stop_reason === 'max_tokens') throw new Error('El plan es demasiado largo para leerlo de una vez. Divide el PDF en dos partes.')
  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  try {
    return JSON.parse(text) as ParsedPlan
  } catch {
    throw new Error('La respuesta de Claude no se pudo leer. Vuelve a intentarlo.')
  }
}
