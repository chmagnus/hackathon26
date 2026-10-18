/**
 * SCREEN 2 · PLANET VIEW (folder: Moons)
 * The zoomed-in mode of the shared Universe: one moon per chapter (orbit) circling Home's planet.
 * The moons are drawn in the Universe canvas (MoonSystem, via <InUniverse>); this component is the 2D overlay
 * (HUD, chapter panel, toast), shown once the camera has arrived at the planet.
 * Click an unlocked moon: the orbits freeze, the camera flies to it, and its concepts are listed.
 *
 * Plug-in points:
 *  - planet: from GET /api/systems/{id} (App passes it). Without it the mock blockchain planet is used.
 *  - progress / onCompleteMoon(moonId): the planet's saved progress, and a concept was completed on its page.
 *    Without them, mock progress is used and completions only last this session.
 *  - onSelectChapter(orbitNumber): called once the camera has arrived at a chapter moon.
 *  - renderConcept(moonId, handlers): renders the Concept page for a picked concept. The card-expands transition
 *    in and out of it is handled here (useConceptTransition); `handlers` (onBack/onComplete/onOpenMoon) go to the page.
 *  - onSelectMoon(moonId): used instead when no renderConcept is given (no transition).
 * Which planet/chapter the camera is on lives in the shared view (src/galaxy/view.ts).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InUniverse } from '../../galaxy/tunnel'
import { useView } from '../../galaxy/view'
import { playMoonClick } from '../../shared/sounds'
import { ChapterPanel } from './ChapterPanel'
import { chapterState, type ChapterProgress } from './chapters'
import { ConceptLayer } from './ConceptLayer'
import { useConceptTransition, type ConceptHandlers } from './useConceptTransition'
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
  onCompleteMoon?: (moonId: string) => void
  renderConcept?: (moonId: string, handlers: ConceptHandlers) => ReactNode
}

const logMoon = (moonId: string) => console.log('select moon', moonId)

export function MoonsScreen({ planet = MOCK_PLANET, progress: initialProgress = MOCK_PROGRESS, onSelectChapter, onSelectMoon = logMoon, onCompleteMoon, renderConcept }: MoonsScreenProps) {
  // concepts completed on the Concept page this session, when no onCompleteMoon saves them
  const [justCompleted, setJustCompleted] = useState<string[]>([])
  const progress: ChapterProgress = { completed: [...new Set([...initialProgress.completed, ...justCompleted])] }
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
    // whoosh only when the camera actually starts flying to a new moon
    if (chapter !== orbitNumber) {
      playMoonClick()
      setChapter(orbitNumber)
    }
  }

  // tell the parent once the camera has arrived at a chapter (latest callback, without re-subscribing)
  const selectChapterRef = useRef(onSelectChapter)
  useEffect(() => { selectChapterRef.current = onSelectChapter })
  useEffect(() => useView.subscribe((s, prev) => {
    if (s.chapterArrived && !prev.chapterArrived && s.chapter !== null) selectChapterRef.current?.(s.chapter)
  }), [])

  // close the chapter: the camera flies back to the planet view and the orbits resume
  const close = () => setChapter(null)

  // opening a concept page from the panel, with the card-expands transition
  const concept = useConceptTransition({
    moons: focusedOrbit?.moons ?? [],
    onCompleted: (id) => onCompleteMoon ? onCompleteMoon(id) : setJustCompleted((d) => (d.includes(id) ? d : [...d, id])),
  })
  const { phase: conceptPhase, close: closeConcept } = concept
  function selectMoon(moonId: string, rect: DOMRect) {
    if (renderConcept) concept.open(moonId, rect)
    else onSelectMoon(moonId)
  }

  // Escape: back from the concept page, else close the open chapter, else go back to the universe (same as "← Universe").
  // Ignored while a concept transition is running.
  useEffect(() => {
    if (!atPlanet) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (conceptPhase === 'open') closeConcept()
      else if (conceptPhase !== 'closed') return
      else if (chapter !== null) setChapter(null)
      else setView({ mode: 'universe' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [atPlanet, chapter, setChapter, setView, conceptPhase, closeConcept])

  return (
    <>
      <InUniverse>
        <MoonSystem planet={planet} states={states} onSelectChapter={selectChapter} />
      </InUniverse>

      {/* overlay on top of the Universe canvas: lets the pointer through, except on its own panels and buttons */}
      <div className={`pointer-events-none absolute inset-0 overflow-hidden font-body text-ink transition-[opacity,visibility] duration-500 ${here ? '' : 'invisible opacity-0'}`}>
        <MoonsHud planet={planet} states={states} onBack={() => setView({ mode: 'universe' })} hideHint={chapter !== null} />

        {focusedOrbit && (
          <ChapterPanel
            orbit={focusedOrbit}
            completed={progress.completed}
            onSelectMoon={selectMoon}
            onClose={close}
            expandingId={concept.expandingId}
            away={concept.away}
            glowId={concept.glowId}
            busy={concept.busy}
          />
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

      {renderConcept && (
        <ConceptLayer
          phase={concept.phase}
          moonId={concept.moonId}
          ghost={concept.ghost}
          pageShown={concept.pageShown}
          dimmed={concept.dimmed}
          busy={concept.busy}
          renderPage={(moonId) => renderConcept(moonId, concept.handlers)}
        />
      )}
    </>
  )
}
