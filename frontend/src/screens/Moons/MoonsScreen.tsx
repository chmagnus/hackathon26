/**
 * SCREEN 2 · PLANET VIEW (folder: Moons)
 * One algorithm's planet in the centre, with one moon per chapter (orbit) circling it.
 * Click an unlocked moon: the orbits freeze, the camera flies to it, and its concepts are listed.
 *
 * Plug-in points:
 *  - planet: will come from GET /api/systems/{id}. Until then the mock blockchain planet is used.
 *  - progress: will come from the shared progress store. Until then mock progress is used.
 *  - onBack: go back to the Universe (Home) screen.
 *  - onSelectChapter(orbitNumber): called once the camera has arrived at a chapter moon.
 *  - onSelectMoon(moonId): a concept was picked in the chapter panel -> open the Concept page.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ChapterPanel } from './ChapterPanel'
import { chapterState, type ChapterProgress } from './chapters'
import { CAMERA_DISTANCE, CAMERA_ELEVATION } from './layout'
import { MoonsHud } from './MoonsHud'
import { MoonsScene } from './MoonsScene'
import { MOCK_PLANET } from './mockPlanet'
import { MOCK_PROGRESS } from './mockProgress'
import type { Planet } from './types'

const CAMERA_START: [number, number, number] = [0, Math.sin(CAMERA_ELEVATION) * CAMERA_DISTANCE, Math.cos(CAMERA_ELEVATION) * CAMERA_DISTANCE]
const TOAST_MS = 4000

export interface MoonsScreenProps {
  planet?: Planet
  progress?: ChapterProgress
  onBack?: () => void
  onSelectChapter?: (orbitNumber: number) => void
  onSelectMoon?: (moonId: string) => void
}

const logMoon = (moonId: string) => console.log('select moon', moonId)

export function MoonsScreen({ planet = MOCK_PLANET, progress = MOCK_PROGRESS, onBack, onSelectChapter, onSelectMoon = logMoon }: MoonsScreenProps) {
  const states = planet.orbits.map((orbit) => chapterState(orbit, planet.orbits, progress))

  // single source of truth: which chapter the camera is on (null = overview)
  const [focused, setFocused] = useState<number | null>(null)
  // the chapter the camera has finished flying to; the panel only shows once this matches `focused`
  const [arrivedAt, setArrivedAt] = useState<number | null>(null)
  const focusedOrbit = focused !== null && arrivedAt === focused ? planet.orbits.find((o) => o.number === focused) ?? null : null

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
    if (focused === orbitNumber) return
    setArrivedAt(null)
    setFocused(orbitNumber)
  }

  // keep the latest callback without re-running the camera effect when the parent passes a new function
  const selectChapterRef = useRef(onSelectChapter)
  useEffect(() => { selectChapterRef.current = onSelectChapter })
  const handleArrive = useCallback((orbitNumber: number) => {
    setArrivedAt(orbitNumber)
    selectChapterRef.current?.(orbitNumber)
  }, [])

  const close = useCallback(() => {
    setFocused(null)
    setArrivedAt(null)
  }, [])

  useEffect(() => {
    if (focused === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, close])

  return (
    <div className="relative h-full overflow-hidden bg-void font-body text-ink">
      {/* same canvas settings as Home (antialiasing comes from the effect composer's multisampling) */}
      <Canvas className="absolute! inset-0" camera={{ fov: 42, near: 0.1, far: 4000, position: CAMERA_START }} dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // if the graphics driver drops the WebGL context, ask the browser to restore it instead of staying black
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}>
        <MoonsScene planet={planet} states={states} focused={focused} onSelectChapter={selectChapter} onArrive={handleArrive} />
      </Canvas>
      <MoonsHud planet={planet} states={states} onBack={onBack} hideHint={focused !== null} />

      {focusedOrbit && (
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
  )
}
