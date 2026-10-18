import { useEffect, useMemo, useState } from 'react'
import { fetchCurriculum } from './api/content'
import { Universe } from './galaxy/Universe'
import { useView } from './galaxy/view'
import { HomeScreen } from './screens/Home/HomeScreen'
import { HOME_PLANETS, type PlanetId } from './screens/Home/planets'
import { MoonsScreen } from './screens/Moons/MoonsScreen'
import { MOCK_PLANET } from './screens/Moons/mockPlanet'
import type { Planet } from './screens/Moons/types'
import ConceptScreen from './screens/Concept/ConceptScreen'
import { useProgress } from './store/progress'

/**
 * Every planet's lessons, from the backend. Until they arrive, or if the backend can't be reached, the built-in
 * Blockchain planet stands in (its moon ids match the real ones), so Nova still runs without the backend.
 */
function useCurriculum(): Planet[] {
  const [planets, setPlanets] = useState<Planet[]>([MOCK_PLANET])
  useEffect(() => {
    const controller = new AbortController()
    fetchCurriculum(controller.signal).then(
      (loaded) => { if (loaded.length) setPlanets(loaded) },
      (error: unknown) => {
        if (!controller.signal.aborted) console.warn('Lessons could not be loaded; using the built-in Blockchain planet.', error)
      },
    )
    return () => controller.abort()
  }, [])
  return planets
}

const moonsOf = (planet: Planet) => planet.orbits.flatMap((orbit) => orbit.moons)
const isPlanetId = (id: string): id is PlanetId => HOME_PLANETS.some((p) => p.id === id)
const NONE: string[] = []

// One shared 3D Universe with each screen's 2D overlay on top. Which planet/chapter the camera is on lives in
// src/galaxy/view.ts (maps to routes later: '/', '/:planetId', '/:planetId/:moonId').
// The Concept page opens from the Moon screen's chapter panel, which also runs the transition in and out of it.
export default function App() {
  const planets = useCurriculum()
  const view = useView((s) => s.view)
  // the planet whose moons are shown. It stays after you leave, so its moons sink back in as the camera flies out.
  const [shownId, setShownId] = useState<string>('blockchain')
  if (view.mode === 'planet' && view.id !== shownId) setShownId(view.id)
  const planet = planets.find((p) => p.id === shownId) ?? planets[0]
  const moonCounts = useMemo(() => Object.fromEntries(planets.map((p) => [p.id, moonsOf(p).length])), [planets])

  // progress is saved in this browser (src/store/progress.ts)
  const systems = useProgress((s) => s.systems)
  const captured = useProgress((s) => s.captured)
  const completedMoons = useMemo(() => Object.fromEntries(planets.map((p) => {
    const done = new Set(systems[p.id]?.completed)
    return [p.id, moonsOf(p).filter((m) => done.has(m.id)).length]
  })), [planets, systems])

  // A planet finished on this visit joins your orbit once you're back in the universe, so you see it pulled in.
  const [arriving, setArriving] = useState<string | null>(null)
  if (arriving && view.mode === 'universe') setArriving(null)

  function completeMoon(moonId: string) {
    const progress = useProgress.getState()
    progress.completeMoon(planet.id, moonId)
    const done = new Set(useProgress.getState().systems[planet.id]?.completed)
    if (!captured.includes(planet.id) && moonsOf(planet).every((m) => done.has(m.id))) {
      progress.capturePlanet(planet.id)
      setArriving(planet.id)
    }
  }

  return (
    <div className="relative h-full overflow-hidden">
      <Universe />
      <HomeScreen
        moonCounts={moonCounts}
        completedMoons={completedMoons}
        captured={captured.filter((id): id is PlanetId => isPlanetId(id) && id !== arriving)}
      />
      <MoonsScreen
        key={planet.id}
        planet={planet}
        progress={{ completed: systems[planet.id]?.completed ?? NONE, edits: systems[planet.id]?.edits }}
        onCompleteMoon={completeMoon}
        renderConcept={(moonId, handlers) => <ConceptScreen planetId={planet.id} moonId={moonId} {...handlers} />}
      />
    </div>
  )
}
