import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Copy, HeartPulse, Image as ImageIcon, KeyRound, Smartphone } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { PersonId } from '../../data/types'
import { useAuth } from '../../lib/auth'
import { shortDate } from '../../lib/dates'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { Press, spring } from '../ui'

const URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/plato-import`

interface TokenRow {
  person: PersonId
  created_at: string
  last_used_at: string | null
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className={`min-w-0 flex-1 text-[13px] break-all ${secret ? 'font-semibold' : ''}`}>{value}</code>
        <Press
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setDone(true)
            setTimeout(() => setDone(false), 1600)
          }}
          aria-label={`Copiar ${label.toLowerCase()}`}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface"
        >
          {done ? <Check className="size-4 text-veg" /> : <Copy className="size-4" />}
        </Press>
      </div>
    </div>
  )
}

function Guide({ icon, title, sub, children }: { icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-3xl bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 p-4 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-[13px] text-muted">{sub}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
          <ChevronDown className="size-4 text-muted" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <ol className="space-y-2.5 px-4 pb-4 text-[14px] leading-snug">{children}</ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-3">
    <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{n}</span>
    <span>{children}</span>
  </li>
)
const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold">{children}</strong>

/** Enviar pesajes desde el iPhone con Atajos: código personal y pasos */
export function IphoneImport() {
  const { profile } = useAuth()
  const names = useStore((s) => s.shared.names)
  const current = useStore((s) => s.person)
  const people = (['fran', 'lua'] as PersonId[]).filter((p) => profile?.can_view.includes(p))
  const [person, setPerson] = useState<PersonId>(people.includes(current) ? current : people[0])
  const [rows, setRows] = useState<TokenRow[]>([])
  const [fresh, setFresh] = useState<{ person: PersonId; token: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    const { data } = await supabase.from('plato_import_tokens').select('person, created_at, last_used_at')
    setRows((data as TokenRow[]) ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  if (!supabase || !people.length) return null
  const row = rows.find((r) => r.person === person)
  const token = fresh?.person === person ? fresh.token : null

  const create = async () => {
    setBusy(true)
    setMsg(null)
    const { data, error } = await supabase!.rpc('plato_create_import_token', { p: person })
    setBusy(false)
    if (error) return setMsg('No se pudo crear el código. Revisa la conexión.')
    setFresh({ person, token: data as string })
    void load()
  }
  const revoke = async () => {
    setBusy(true)
    await supabase!.rpc('plato_revoke_import_token', { p: person })
    setBusy(false)
    setFresh(null)
    void load()
  }

  return (
    <section className="mt-7">
      <h3 className="display flex items-center gap-2 text-lg font-semibold">
        <Smartphone className="size-4" /> Enviar pesajes desde el iPhone
      </h3>
      <p className="mt-1 text-sm text-muted">Con la app Atajos: el peso de Salud o la captura de la báscula llegan solos a Plato.</p>

      {people.length > 1 && (
        <div className="mt-3 flex rounded-full bg-surface p-1">
          {people.map((p) => (
            <Press key={p} onClick={() => setPerson(p)} aria-pressed={person === p} className={`relative h-9 flex-1 rounded-full text-sm font-semibold ${person === p ? 'text-on-accent' : 'text-muted'}`}>
              {person === p && <motion.span layoutId="import-person" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
              <span className="relative">Pesajes de {names[p]}</span>
            </Press>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-3 rounded-3xl border border-line p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-carb/15 text-carb">
            <KeyRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Tu código personal</p>
            <p className="text-[13px] text-muted">
              {row ? `Creado el ${shortDate(row.created_at.slice(0, 10))}${row.last_used_at ? ` · último uso ${shortDate(row.last_used_at.slice(0, 10))}` : ' · sin usar aún'}` : 'Aún no tienes código para este plan'}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {token && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="rounded-2xl bg-veg/15 px-3 py-2 text-[13px] text-veg">Cópialo ahora en el atajo: por seguridad no se vuelve a mostrar.</p>
              <CopyRow label="Código (cabecera x-plato-token)" value={token} secret />
            </motion.div>
          )}
        </AnimatePresence>
        <CopyRow label="Dirección (URL)" value={URL} />
        {msg && <p className="text-sm text-prot">{msg}</p>}

        <div className="flex gap-2">
          <Press disabled={busy} onClick={create} className="h-11 flex-1 rounded-2xl bg-accent text-sm font-semibold text-on-accent disabled:opacity-50">
            {row ? 'Crear un código nuevo' : 'Crear código'}
          </Press>
          {row && (
            <Press disabled={busy} onClick={revoke} className="h-11 rounded-2xl bg-surface px-4 text-sm font-semibold text-prot">
              Anular
            </Press>
          )}
        </div>
        {row && !token && <p className="text-[13px] text-muted">Si creas uno nuevo, el anterior deja de funcionar y tendrás que pegarlo otra vez en los atajos.</p>}
      </div>

      <div className="mt-3 space-y-2">
        <Guide icon={<HeartPulse className="size-5 text-prot" />} title="Atajo «Pesaje a Plato»" sub="Envía el último peso y % de grasa de Salud">
          <Step n={1}>
            En <B>Xiaomi Home</B> (o Mi Fitness) activa los permisos de <B>Salud</B> para que la báscula guarde allí el peso y la grasa.
          </Step>
          <Step n={2}>
            Abre <B>Atajos</B> → <B>+</B> y llámalo «Pesaje a Plato».
          </Step>
          <Step n={3}>
            Añade <B>Buscar muestras de salud</B>: tipo <B>Peso</B>, ordenar por <B>Fecha de inicio</B>, <B>Más reciente primero</B>, limitar a <B>1</B>.
          </Step>
          <Step n={4}>
            Añade otra <B>Buscar muestras de salud</B> igual, pero con tipo <B>Porcentaje de grasa corporal</B>.
          </Step>
          <Step n={5}>
            Añade <B>Formatear fecha</B> con la <B>Fecha de inicio</B> del peso, formato <B>ISO 8601</B>.
          </Step>
          <Step n={6}>
            Añade <B>Obtener contenido de URL</B>: pega la dirección, método <B>POST</B>, en <B>Cabeceras</B> añade <B>x-plato-token</B> con tu código, y en <B>Cuerpo de la solicitud</B> elige <B>JSON</B> con: <B>weight</B> = valor del peso, <B>fatPct</B> = valor de la grasa, <B>date</B> = fecha formateada.
          </Step>
          <Step n={7}>
            Añade <B>Mostrar notificación</B> con el <B>Contenido de la URL</B>: verás «Guardado en Plato: 111,3 kg…».
          </Step>
          <Step n={8}>
            Para que vaya solo: <B>Automatización</B> → <B>+</B> → <B>Hora del día</B> (por ejemplo, 10:00 cada día) → <B>Ejecutar inmediatamente</B> → elige el atajo. Si repites el mismo día, se actualiza ese pesaje; no se duplica.
          </Step>
        </Guide>

        <Guide icon={<ImageIcon className="size-5 text-carb" />} title="Atajo «Captura a Plato»" sub="Comparte la captura de la báscula y se guarda con todos los datos">
          <Step n={1}>
            En <B>Atajos</B> → <B>+</B>, llámalo «Captura a Plato». En los detalles (ⓘ) activa <B>Mostrar en hoja de compartir</B> y deja solo <B>Imágenes</B>.
          </Step>
          <Step n={2}>
            Añade <B>Convertir imagen</B> (Entrada del atajo) a <B>JPEG</B>.
          </Step>
          <Step n={3}>
            Añade <B>Redimensionar imagen</B> a <B>1200</B> de ancho.
          </Step>
          <Step n={4}>
            Añade <B>Obtener contenido de URL</B>: pega la dirección, método <B>POST</B>, <B>Cabeceras</B>: <B>x-plato-token</B> con tu código y <B>Content-Type</B> = <B>image/jpeg</B>; <B>Cuerpo de la solicitud</B>: <B>Archivo</B> → la imagen redimensionada.
          </Step>
          <Step n={5}>
            Añade <B>Mostrar notificación</B> con el <B>Contenido de la URL</B>.
          </Step>
          <Step n={6}>
            Uso: haz la captura en la app de la báscula → <B>Compartir</B> → <B>Captura a Plato</B>. Lee peso, grasa, músculo, agua, grasa visceral, edad corporal y el resto, y guarda la foto.
          </Step>
        </Guide>
      </div>
    </section>
  )
}
