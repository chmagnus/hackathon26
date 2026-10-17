import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Universe } from './galaxy/Universe'
import { useView } from './galaxy/view'
import { HomeScreen } from './screens/Home/HomeScreen'
import { HOME_PLANETS, type PlanetId } from './screens/Home/planets'
import { MoonsScreen } from './screens/Moons/MoonsScreen'

// Which screen is showing. Kept as plain state for now; maps to routes later ('/' and '/:planetId').
type Screen = { name: 'home' } | { name: 'moons'; planetId: PlanetId }

/*
 * Warp transition. The Moon screen still has its own WebGL canvas (until step 3), so swapping to it flashes black while it starts.
 * A full-screen glow covers the swap: fade in -> switch screens underneath -> wait for the new scene's first frame -> fade out.
 */
const REDUCED_MOTION = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const COVER_MS = REDUCED_MOTION ? 150 : 350
const REVEAL_MS = REDUCED_MOTION ? 200 : 500
/** if a screen never reports it's ready (e.g. no WebGL), uncover anyway after this long */
const READY_TIMEOUT_MS = 3000
/** Home has no "first frame drawn" signal, so wait this many animation frames after it mounts */
const HOME_READY_FRAMES = 4
type WarpPhase = 'idle' | 'cover' | 'reveal'
type WarpKind = 'forward' | 'back'

function warpStyle(phase: WarpPhase, kind: WarpKind, colour: string): CSSProperties {
  const background = REDUCED_MOTION
    ? '#03040a'
    : kind === 'forward'
      // bright centre in the planet's colour, dark edges: flying into the planet
      ? `radial-gradient(circle at 50% 50%, #ffffff 0%, ${colour} 20%, ${colour}66 46%, #03040a 80%)`
      // softer and darker on the way back out
      : `radial-gradient(circle at 50% 50%, ${colour}55 0%, #0b1124 42%, #03040a 78%)`
  const scale = REDUCED_MOTION ? 1 : phase === 'idle' ? 0.6 : phase === 'cover' ? 1 : 1.5
  const ms = phase === 'cover' ? COVER_MS : REVEAL_MS
  return {
    background,
    opacity: phase === 'cover' ? 1 : 0,
    transform: `scale(${scale})`,
    // idle resets instantly so the next warp starts small again
    transition: phase === 'idle' ? 'none' : `opacity ${ms}ms ease-out, transform ${ms}ms ease-out`,
    pointerEvents: phase === 'idle' ? 'none' : 'auto',
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  const [warp, setWarp] = useState<{ phase: WarpPhase; kind: WarpKind }>({ phase: 'idle', kind: 'forward' })
  // mirrors warp.phase for timer callbacks, which would otherwise see a stale value
  const warpPhase = useRef<WarpPhase>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function setPhase(phase: WarpPhase, kind?: WarpKind) {
    warpPhase.current = phase
    setWarp((w) => ({ phase, kind: kind ?? w.kind }))
  }

  /**
   * Cover the screen, switch to `next` underneath (running `onSwitch` at the same moment),
   * and uncover once it reports ready (or after a timeout).
   */
  function warpTo(next: Screen, kind: WarpKind, onSwitch?: () => void) {
    if (warpPhase.current !== 'idle') return
    // drop the previous warp's leftover ready-timeout so it can't uncover this one early
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('cover', kind)
    later(() => {
      setScreen(next)
      onSwitch?.()
      later(reveal, READY_TIMEOUT_MS)
    }, COVER_MS)
  }

  function reveal() {
    if (warpPhase.current !== 'cover') return
    setPhase('reveal')
    later(() => setPhase('idle'), REVEAL_MS)
  }

  // Home can't tell us when it has drawn, so give its canvas a few frames after mounting before uncovering
  useEffect(() => {
    if (screen.name !== 'home' || warpPhase.current !== 'cover') return
    let frames = 0, raf = 0
    const tick = () => {
      if (++frames >= HOME_READY_FRAMES) reveal()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // reveal only reads refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // Home only calls this for live planets, once the shared camera has arrived (coming-soon ones toast in Home)
  function selectPlanet(planetId: PlanetId) {
    warpTo({ name: 'moons', planetId }, 'forward')
  }

  // the shared camera flies back out to the overview while the warp uncovers Home
  function backToUniverse() {
    warpTo({ name: 'home' }, 'back', () => useView.getState().setView({ mode: 'universe' }))
  }

  const planetId = screen.name === 'moons' ? screen.planetId : 'blockchain'
  const colour = HOME_PLANETS.find((p) => p.id === planetId)?.color ?? '#6ff2c5'

  return (
    <div className="relative h-full overflow-hidden">
      {/* Universe and Home stay mounted throughout, so the camera can fly back out from the planet.
          Step 2 of the shared-canvas plan: the Moon screen still has its own canvas, drawn on top of them. */}
      <Universe />
      <div className={screen.name === 'moons' ? 'invisible' : undefined}>
        <HomeScreen onSelectPlanet={selectPlanet} />
      </div>
      {screen.name === 'moons' && (
        // planetId will choose the planet once content comes from the API
        <MoonsScreen onBack={backToUniverse} onReady={reveal} />
      )}

      {/* warp overlay: always mounted so its fade-in can transition from the idle state */}
      <div aria-hidden className="absolute inset-0 z-50" style={warpStyle(warp.phase, warp.kind, colour)} />
    </div>
  )
}
