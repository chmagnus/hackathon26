import { useEffect, useRef, useState } from 'react'
import { HomeScreen } from './screens/Home/HomeScreen'
import { HOME_PLANETS, type PlanetId } from './screens/Home/planets'
import { MoonsScreen } from './screens/Moons/MoonsScreen'

// Which screen is showing. Kept as plain state for now; maps to routes later ('/' and '/:planetId').
type Screen = { name: 'home' } | { name: 'moons'; planetId: PlanetId }

/** Planets whose Moon screen exists. MoonsScreen only has blockchain data so far. */
const OPEN_PLANETS: PlanetId[] = ['blockchain']
const TOAST_MS = 4000

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  // bumped to remount Home: after onSelectPlanet it keeps its camera on the planet and ignores further clicks
  const [homeKey, setHomeKey] = useState(0)

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

  function selectPlanet(planetId: PlanetId) {
    if (OPEN_PLANETS.includes(planetId)) {
      setScreen({ name: 'moons', planetId })
      return
    }
    const name = HOME_PLANETS.find((p) => p.id === planetId)?.name ?? 'This planet'
    showToast(`${name} is coming soon.`)
    setHomeKey((k) => k + 1)
  }

  if (screen.name === 'moons') {
    // planetId will choose the planet once content comes from the API
    return <MoonsScreen onBack={() => setScreen({ name: 'home' })} />
  }
  return (
    <div className="relative h-full">
      <HomeScreen key={homeKey} onSelectPlanet={selectPlanet} />
      {toast && (
        <div
          role="status"
          className={`pointer-events-none absolute bottom-16 left-1/2 z-40 max-w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-[14px] border border-[rgba(140,170,255,.17)] bg-[#0b1124] px-4 py-[11px] font-body text-[14.5px] text-ink shadow-[0_12px_40px_rgba(0,0,0,.5)] transition-all duration-300 ${toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'}`}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
