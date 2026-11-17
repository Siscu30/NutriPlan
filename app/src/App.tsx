import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { SideRail, TabBar, type Tab } from './components/Nav'
import { PageViewerProvider } from './components/PageViewer'
import { RecipeSheet, type SheetTarget } from './components/RecipeSheet'
import { Settings } from './components/Settings'
import type { SlotMeal } from './data/types'
import { today } from './lib/dates'
import { useStore } from './lib/store'
import { restartSync } from './lib/sync'
import { Guia } from './screens/Guia'
import { Hoy } from './screens/Hoy'
import { Recetas } from './screens/Recetas'
import { Semana } from './screens/Semana'

const ImportSheet = lazy(() => import('./components/ImportSheet'))
const ORDER: Tab[] = ['hoy', 'semana', 'recetas', 'guia']
const THEME = { fran: '#2b1531', lua: '#0d3f3c' }

export default function App() {
  const person = useStore((s) => s.person)
  const [tab, setTabRaw] = useState<Tab>('hoy')
  const [dir, setDir] = useState(1)
  const [date, setDate] = useState(today())
  const [offset, setOffset] = useState(0)
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  const [settings, setSettings] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => restartSync(), [])
  // Color de fondo según de quién es el plan
  useEffect(() => {
    document.documentElement.dataset.person = person
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME[person])
  }, [person])

  const setTab = (t: Tab) => {
    setDir(ORDER.indexOf(t) >= ORDER.indexOf(tab) ? 1 : -1)
    setTabRaw(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <MotionConfig reducedMotion="user">
      <PageViewerProvider>
        <div className="flex min-h-dvh">
          <SideRail tab={tab} onChange={setTab} />
          <main className="pt-safe min-w-0 flex-1 overflow-x-clip px-4 pb-32 md:px-10 md:pt-10 md:pb-16">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={tab}
                custom={dir}
                initial={{ opacity: 0, x: 28 * dir, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -28 * dir, filter: 'blur(4px)', transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              >
                {tab === 'hoy' && (
                  <Hoy date={date} setDate={setDate} openSlot={(slot: SlotMeal) => setSheet({ kind: 'slot', date, slot })} openSettings={() => setSettings(true)} />
                )}
                {tab === 'semana' && (
                  <Semana
                    offset={offset}
                    setOffset={setOffset}
                    openSlot={(d, slot) => setSheet({ kind: 'slot', date: d, slot })}
                    goDay={(d) => {
                      setDate(d)
                      setTab('hoy')
                    }}
                  />
                )}
                {tab === 'recetas' && <Recetas date={date} openRecipe={(planId, id) => setSheet({ kind: 'recipe', planId, id })} />}
                {tab === 'guia' && <Guia date={date} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <RecipeSheet target={sheet} onClose={() => setSheet(null)} date={date} />
        <Settings
          open={settings}
          onClose={() => setSettings(false)}
          onImport={() => {
            setSettings(false)
            setImporting(true)
          }}
        />
        {importing && (
          <Suspense fallback={null}>
            <ImportSheet open={importing} onClose={() => setImporting(false)} />
          </Suspense>
        )}
      </PageViewerProvider>
    </MotionConfig>
  )
}
