import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { MediaImg, Press, spring } from './ui'

type Open = (pages: string[], index?: number, title?: string) => void
const Ctx = createContext<Open>(() => {})
export const usePageViewer = () => useContext(Ctx)

/** Visor a pantalla completa de las páginas originales del PDF */
export function PageViewerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<{ pages: string[]; i: number; title?: string } | null>(null)
  const open = useCallback<Open>((pages, index = 0, title) => setView({ pages, i: index, title }), [])
  const close = () => setView(null)
  const go = (d: number) => setView((v) => (v ? { ...v, i: Math.min(v.pages.length - 1, Math.max(0, v.i + d)) } : v))

  useEffect(() => {
    if (!view) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  return (
    <Ctx.Provider value={open}>
      {children}
      <AnimatePresence>
        {view && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={view.title ?? 'Página original'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm"
            onClick={close}
          >
            <div className="pt-safe flex items-center justify-between gap-3 px-4 pb-3 text-white" onClick={(e) => e.stopPropagation()}>
              <p className="min-w-0 truncate text-sm opacity-80">
                {view.title ?? 'Página original'} · {view.i + 1} de {view.pages.length}
              </p>
              <Press onClick={close} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-white/15">
                <X className="size-5" />
              </Press>
            </div>
            <div className="relative min-h-0 flex-1 overflow-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={view.pages[view.i]}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  drag={view.pages.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(1)
                    if (info.offset.x > 60) go(-1)
                  }}
                  className="mx-auto w-full max-w-3xl touch-pan-y"
                >
                  <MediaImg src={view.pages[view.i]} alt={`Página ${view.i + 1}`} className="block aspect-[595/842] w-full rounded-xl bg-white object-contain" />
                </motion.div>
              </AnimatePresence>
            </div>
            {view.pages.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden justify-between px-4 md:flex">
                <Press onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Página anterior" className="pointer-events-auto grid size-12 place-items-center rounded-full bg-white/15 text-white">
                  <ChevronLeft />
                </Press>
                <Press onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Página siguiente" className="pointer-events-auto grid size-12 place-items-center rounded-full bg-white/15 text-white">
                  <ChevronRight />
                </Press>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}
