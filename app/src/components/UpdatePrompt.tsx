import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Press, spring } from './ui'

const EVERY = 30 * 60 * 1000

/** ¿Hay algo abierto (una hoja o un visor) que una recarga haría perder? */
const busy = () => !!document.querySelector('[data-vaul-drawer], [role="dialog"]')

/**
 * Mantiene la app al día. En el iPhone, la app de la pantalla de inicio casi nunca se recarga,
 * así que se busca versión nueva al volver a ella y cada 30 minutos.
 * Si no hay nada abierto se actualiza sola; si lo hay, muestra un aviso.
 */
export function UpdatePrompt() {
  const reg = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return
      reg.current = r
      setInterval(() => void r.update().catch(() => {}), EVERY)
    },
  })

  useEffect(() => {
    const check = () => document.visibilityState === 'visible' && void reg.current?.update().catch(() => {})
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  // Versión nueva y nada a medias: se aplica sin preguntar
  useEffect(() => {
    if (needRefresh && !busy()) void updateServiceWorker(true)
  }, [needRefresh, updateServiceWorker])

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={spring}
          className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4"
        >
          <div className="glass shadow-soft pointer-events-auto mt-3 flex items-center gap-3 rounded-full border border-line py-1.5 pr-1.5 pl-4">
            <span className="text-sm font-semibold">Nueva versión disponible</span>
            <Press onClick={() => void updateServiceWorker(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-semibold text-on-accent">
              <RefreshCw className="size-3.5" /> Actualizar
            </Press>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
