// Lee la captura de la báscula inteligente con Claude (desde el navegador, con la clave del usuario).
import Anthropic from '@anthropic-ai/sdk'
import { SCALE, type ScaleKey } from '../data/body'

export interface ScaleReading {
  date: string
  v: Partial<Record<ScaleKey, number>>
}

const num = { anyOf: [{ type: 'number' }, { type: 'null' }] }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'values'],
  properties: {
    date: { type: 'string', description: 'Fecha de la medición en formato AAAA-MM-DD, o cadena vacía si no aparece' },
    values: {
      type: 'object',
      additionalProperties: false,
      required: SCALE.map((m) => m.key),
      properties: Object.fromEntries(SCALE.map((m) => [m.key, num])),
    },
  },
}

const FIELDS = SCALE.map((m) => `- ${m.key}: ${m.label}${m.unit ? ` (${m.unit})` : ''}`).join('\n')

const SYSTEM = `Lees capturas de pantalla de apps de básculas inteligentes (en español) y devuelves sus valores.
Reglas:
- Copia exactamente los números que se ven; la coma es el separador decimal ("111,3" → 111.3).
- Si un dato no aparece en la captura, devuelve null. No calcules ni estimes nada.
- No confundas los cambios respecto a la medición anterior (flechas ↑ ↓ con números pequeños) con los valores.
- Campos:
${FIELDS}
- "boneKg" es el contenido mineral óseo en kg; "bonePct" el porcentaje mineral óseo.
- "skeletalKg" es la masa muscular esquelética; "muscleKg" la masa muscular total.
- "visceral" es la calificación de grasa visceral; "whr" la relación cintura-cadera; "score" la puntuación corporal.
- "date": la fecha de la medición si aparece (por ejemplo "15/11/2026 11:31" → "2026-11-15").`

export async function readScaleCapture(apiKey: string, jpegBase64: string, signal?: AbortSignal): Promise<ScaleReading> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const msg = await client.beta.messages.create(
    {
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
            { type: 'text', text: 'Devuelve los valores de esta captura.' },
          ],
        },
      ],
    },
    { signal },
  )
  if (msg.stop_reason === 'refusal') throw new Error('Claude no ha podido leer esta captura.')
  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  let parsed: { date: string; values: Record<ScaleKey, number | null> }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('No se pudo interpretar la respuesta. Rellena los datos a mano.')
  }
  const v: Partial<Record<ScaleKey, number>> = {}
  for (const [k, val] of Object.entries(parsed.values)) if (typeof val === 'number' && Number.isFinite(val)) v[k as ScaleKey] = val
  return { date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : '', v }
}
