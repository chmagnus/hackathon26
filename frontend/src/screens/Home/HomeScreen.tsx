/**
 * SCREEN 1 · HOME
 * Your star with every algorithm-planet drifting around it. Click a planet to go to its moons.
 * When all of a planet's moons are finished, it gets pulled into orbit around your star.
 *
 * Plug-in points for the rest of the app:
 *  - completedMoons / captured / justCaptured: progress from the shared state (whoever owns it)
 *  - onSelectPlanet(id): called after the camera flies to the clicked planet -> show screen 2 (Moons)
 * If those props aren't passed, the screen runs on its own with demo progress so it can be built and tested alone.
 */
import { useState, type FormEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { HomeScene } from './HomeScene'
import { HOME_PLANETS, type PlanetId } from './planets'
import { playPlanetClick } from '../../shared/sounds'

export interface HomeScreenProps {
  completedMoons?: Partial<Record<PlanetId, number>>
  captured?: PlanetId[]
  justCaptured?: PlanetId | null
  onSelectPlanet?: (id: PlanetId) => void
}

const NAME_KEY = 'nova-name'
const readName = (): string | null => {
  try { return localStorage.getItem(NAME_KEY) } catch { return null }
}
const writeName = (v: string) => {
  try { localStorage.setItem(NAME_KEY, v) } catch { /* storage blocked: keep it in memory only */ }
}

export function HomeScreen(props: HomeScreenProps) {
  // demo progress, used only when the parent doesn't pass real progress
  const [demoCaptured, setDemoCaptured] = useState<PlanetId[]>([])
  const [demoJust, setDemoJust] = useState<PlanetId | null>(null)
  const completedMoons = props.completedMoons ?? { blockchain: demoCaptured.includes('blockchain') ? 5 : 2 }
  const captured = props.captured ?? demoCaptured
  const justCaptured = props.justCaptured ?? demoJust

  const [name, setName] = useState<string | null>(readName)
  const [editingName, setEditingName] = useState(name === null)
  const [draft, setDraft] = useState(name ?? '')
  const [focusId, setFocusId] = useState<PlanetId | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function selectPlanet(id: PlanetId) {
    if (focusId) return
    playPlanetClick()
    setFocusId(id)
    setTimeout(() => {
      if (props.onSelectPlanet) props.onSelectPlanet(id)
      else {
        // no Moons screen hooked up yet: fly back out and say so
        setToast(`${HOME_PLANETS.find((p) => p.id === id)!.name}: the Moons screen (screen 2) opens here.`)
        setTimeout(() => setToast(null), 3500)
        setFocusId(null)
      }
    }, 900)
  }

  function saveName(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    writeName(v)
    setName(v)
    setEditingName(false)
  }
  function continueAsGuest() {
    writeName('')
    setName('')
    setEditingName(false)
  }

  const shown = name || 'Guest'
  const inOrbit = captured.length

  return (
    <div className="relative h-full overflow-hidden bg-void font-body text-ink">
      <Canvas className="absolute! inset-0" camera={{ fov: 42, near: 0.1, far: 4000, position: [0, 50, 110] }} dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // if the graphics driver drops the WebGL context, ask the browser to restore it instead of staying black
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}>
        <HomeScene completedMoons={completedMoons} captured={captured} justCaptured={justCaptured} focusId={focusId} onPlanetClick={selectPlanet} />
      </Canvas>

      {/* user chip (top-left, as in the whiteboard sketch) */}
      <div className="absolute left-4 top-4 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-glass px-3.5 py-2.5 backdrop-blur">
        <span className="grid size-9 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff2c4,#ffb347_55%,#c2541b)] font-extrabold text-[#3a1600]">
          {shown[0].toUpperCase()}
        </span>
        <span className="leading-tight">
          <b className="block">{shown}</b>
          <span className="text-xs text-muted">{inOrbit} planet{inOrbit === 1 ? '' : 's'} in your orbit</span>
        </span>
        <button onClick={() => { setDraft(name ?? ''); setEditingName(true) }} className="ml-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-bold hover:bg-white/10">
          Change
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-2xl border border-white/15 bg-glass px-4 py-2.5 font-display text-lg font-extrabold tracking-[.08em] backdrop-blur max-sm:hidden">
        NOVA
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 w-[min(720px,calc(100%-32px))] -translate-x-1/2 text-center">
        <span className="inline-block rounded-full border border-white/15 bg-glass px-4 py-2 text-sm text-[#cdd5ea] backdrop-blur">
          {inOrbit ? `${inOrbit} of ${HOME_PLANETS.length} planets in your orbit. ` : ''}
          Click a planet to explore its moons. Finish every moon and the planet joins your orbit.
        </span>
      </div>

      {/* dev-only helper so the capture animation can be tested before the other screens exist */}
      {import.meta.env.DEV && !props.captured && (
        <button
          onClick={() => {
            if (demoCaptured.includes('blockchain')) { setDemoCaptured([]); setDemoJust(null) }
            else { setDemoCaptured(['blockchain']); setDemoJust('blockchain') }
          }}
          className="absolute right-4 top-20 rounded-lg border border-dashed border-gold/60 bg-black/60 px-3 py-1.5 font-mono text-xs text-gold"
        >
          DEV: {demoCaptured.includes('blockchain') ? 'reset orbit' : 'finish Blockchain'}
        </button>
      )}

      {toast && (
        <div role="status" className="absolute left-1/2 top-4 z-30 max-w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#0b1124] px-4 py-2.5 text-sm shadow-2xl">
          {toast}
        </div>
      )}

      {/* first visit: ask for a name (a real login page can replace this later) */}
      {editingName && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-void/60 p-6">
          <form onSubmit={saveName} className="flex w-full max-w-[440px] flex-col gap-3.5 rounded-3xl border border-white/15 bg-glass p-7 backdrop-blur-lg">
            <span className="font-mono text-[11.5px] uppercase tracking-[.16em] text-mint">GUTS 2027 · Learn algorithms in 3D</span>
            <h1 className="font-display text-4xl font-extrabold leading-none tracking-wider">Nova</h1>
            <p className="text-[#cdd5ea]">Every algorithm is a planet. Every idea is a moon. Finish all of a planet's moons and it joins your orbit.</p>
            <label htmlFor="home-name" className="font-mono text-[11px] uppercase tracking-widest text-muted">What should we call you?</label>
            <input
              id="home-name"
              autoFocus
              maxLength={24}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your name"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-ink outline-none focus:border-mint"
            />
            <div className="flex flex-wrap gap-2.5">
              <button type="submit" disabled={!draft.trim()} className="flex-1 rounded-xl bg-mint px-4 py-2.5 font-bold text-[#03140e] disabled:opacity-40">Start exploring</button>
              <button type="button" onClick={continueAsGuest} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-bold">Continue as guest</button>
            </div>
            <span className="text-xs text-muted">Your name stays in this browser. Accounts are coming later.</span>
          </form>
        </div>
      )}
    </div>
  )
}
