// Capturas de la báscula: se reducen en el dispositivo y se guardan en la carpeta privada de cada persona.
import type { PersonId } from '../data/types'
import { MEDIA_BUCKET, supabase } from './supabase'

export interface Prepared {
  blob: Blob
  /** JPEG en base64 (sin cabecera) para enviárselo a Claude */
  base64: string
  /** Vista previa local */
  url: string
}

/** Reduce la imagen a 1400 px de alto como máximo y la pasa a JPEG */
export async function prepareImage(file: File): Promise<Prepared> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo leer la imagen.'))), 'image/jpeg', 0.84))
  const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
  return { blob, base64: dataUrl.slice(dataUrl.indexOf(',') + 1), url: URL.createObjectURL(blob) }
}

const pathOf = (person: PersonId, id: string) => `body/${person}/${id}.jpg`

/** Sube la captura y devuelve la referencia privada ("sb:…") */
export async function uploadBodyPhoto(person: PersonId, id: string, blob: Blob): Promise<string> {
  if (!supabase) throw new Error('Falta la conexión con Supabase.')
  const path = pathOf(person, id)
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error('No se pudo guardar la foto. Revisa la conexión.')
  return `sb:${path}`
}

export async function deleteBodyPhoto(ref?: string) {
  if (!supabase || !ref?.startsWith('sb:body/')) return
  await supabase.storage.from(MEDIA_BUCKET).remove([ref.slice(3)])
}
