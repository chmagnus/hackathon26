/**
 * SCREEN 2 · PLANET VIEW (folder: Moons)
 * The zoomed-in mode of the shared Universe: one moon per chapter (orbit) circling Home's planet.
 * The moons are drawn in the Universe canvas (MoonSystem, via <InUniverse>); this component is the 2D overlay
 * (HUD, chapter panel, toast), shown once the camera has arrived at the planet.
 * Click an unlocked moon: the orbits freeze, the camera flies to it, and its concepts are listed.
 *
 * Plug-in points:
 *  - planet: App supplies GET /api/systems/{id}; the default mock is for isolated scene development.
 *  - progress: App supplies persisted learning progress; the default is only for isolated development.
 *  - onSelectChapter(orbitNumber): called once the camera has arrived at a chapter moon.
 *  - onSelectMoon(moonId): a concept was picked in the chapter panel -> open the Concept page.
 * Which planet/chapter the camera is on lives in the shared view (src/galaxy/view.ts).
 */
import { useEffect, useRef, useState } from 'react'
import { InUniverse } from '../../galaxy/tunnel'
import { useView } from '../../galaxy/view'
import { ChapterPanel } from './ChapterPanel'
import { chapterState, type ChapterProgress } from './chapters'
import { MoonSystem } from './MoonSystem'
import { MoonsHud } from './MoonsHud'
import { MOCK_PLANET } from './mockPlanet'
import { MOCK_PROGRESS } from './mockProgress'
import type { Planet } from './types'

const TOAST_MS = 4000

export interface MoonsScreenProps {
  planet?: Planet
  progress?: ChapterProgress
  onSelectChapter?: (orbitNumber: number) => void
  onSelectMoon?: (moonId: string) => void
  conceptOpen?: boolean
}

const logMoon = (moonId: string) => console.log('select moon', moonId)

export function MoonsScreen({ planet = MOCK_PLANET, progress = MOCK_PROGRESS, onSelectChapter, onSelectMoon = logMoon, conceptOpen = false }: MoonsScreenProps) {
  const states = planet.orbits.map((orbit) => chapterState(orbit, planet.orbits, progress))

  const view = useView((s) => s.view)
  const zoomedIn = useView((s) => s.zoomedIn)
  const chapter = useView((s) => s.chapter)
  const chapterArrived = useView((s) => s.chapterArrived)
  const setView = useView((s) => s.setView)
  const setChapter = useView((s) => s.setChapter)
  const atPlanet = view.mode === 'planet' && view.id === planet.id
  // the overlay fades in once the camera is essentially at this planet (live.zoom ~1)
  const here = atPlanet && zoomedIn
  // the panel only shows once the camera has finished flying to the chapter's moon
  const focusedOrbit = chapter !== null && chapterArrived ? planet.orbits.find((o) => o.number === chapter) ?? null : null

  const [toast, setToast] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  function showToast(text: string) {
    setToast(text)
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), TOAST_MS)
  }

  function selectChapter(orbitNumber: number) {
    const i = planet.orbits.findIndex((o) => o.number === orbitNumber)
    if (states[i] === 'locked') {
      const next = planet.orbits[states.indexOf('current')]?.number ?? orbitNumber - 1
      showToast(`Finish chapter ${next} first to unlock this one`)
      return
    }
    if (chapter !== orbitNumber) setChapter(orbitNumber)
  }

  // tell the parent once the camera has arrived at a chapter (latest callback, without re-subscribing)
  const selectChapterRef = useRef(onSelectChapter)
  useEffect(() => { selectChapterRef.current = onSelectChapter })
  useEffect(() => useView.subscribe((s, prev) => {
    if (s.chapterArrived && !prev.chapterArrived && s.chapter !== null) selectChapterRef.current?.(s.chapter)
  }), [])

  // close the chapter: the camera flies back to the planet view and the orbits resume
  const close = () => setChapter(null)

  // Escape: close the open chapter, or with none open go back to the universe (same as "← Universe")
  useEffect(() => {
    if (!atPlanet || conceptOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (chapter !== null) setChapter(null)
      else setView({ mode: 'universe' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [atPlanet, chapter, conceptOpen, setChapter, setView])

  return (
    <>
      <InUniverse>
        <MoonSystem planet={planet} states={states} onSelectChapter={selectChapter} />
      </InUniverse>

      {/* overlay on top of the Universe canvas: lets the pointer through, except on its own panels and buttons */}
      <div className={`pointer-events-none absolute inset-0 overflow-hidden font-body text-ink transition-[opacity,visibility] duration-500 ${here ? '' : 'invisible opacity-0'}`}>
        <MoonsHud planet={planet} states={states} onBack={() => setView({ mode: 'universe' })} onSelectChapter={selectChapter} hideHint={chapter !== null} />

        {focusedOrbit && !conceptOpen && (
          <ChapterPanel orbit={focusedOrbit} completed={progress.completed} onSelectMoon={onSelectMoon} onClose={close} />
        )}

        {toast && (
          <div
            role="status"
            className={`pointer-events-none absolute bottom-16 left-1/2 z-40 max-w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-[14px] border border-[rgba(140,170,255,.17)] bg-[#0b1124] px-4 py-[11px] text-[14.5px] shadow-[0_12px_40px_rgba(0,0,0,.5)] transition-all duration-300 ${toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'}`}
          >
            {toast}
          </div>
        )}
      </div>
    </>
  )
}
