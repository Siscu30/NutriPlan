// Sube las fotos y páginas de app/media/ al almacenamiento privado de Supabase.
// Uso (desde app/):  npm run upload-media
// Pide tu correo y contraseña de administrador en la terminal; no se guardan.
import { createClient } from '@supabase/supabase-js'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const env = Object.fromEntries(
  (await readFile(join(root, '.env.production'), 'utf8').catch(() => ''))
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en app/.env.production')
  process.exit(1)
}

function ask(q, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : '')
    rl.question(q, (a) => {
      rl.close()
      if (hidden) stdout.write('\n')
      resolve(a.trim())
    })
  })
}

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.jpg')) out.push(p)
  }
  return out
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const email = await ask('Correo de administrador: ')
const password = await ask('Contraseña: ', true)
const { error: loginError } = await sb.auth.signInWithPassword({ email, password })
if (loginError) {
  console.error('No se pudo entrar:', loginError.message)
  process.exit(1)
}

const mediaDir = join(root, 'media')
const files = await walk(mediaDir)
let ok = 0
for (const file of files) {
  const path = relative(mediaDir, file).split(sep).join('/')
  const { error } = await sb.storage.from('plato-media').upload(path, await readFile(file), { contentType: 'image/jpeg', upsert: true })
  if (error) console.error(`✗ ${path}: ${error.message}`)
  else ok++
  if (ok % 20 === 0) stdout.write(`${ok}/${files.length}\r`)
}
console.log(`Subidas ${ok} de ${files.length} imágenes.`)
await sb.auth.signOut()
