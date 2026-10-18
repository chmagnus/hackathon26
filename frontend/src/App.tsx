import { useEffect, useState } from 'react'
import { fetchCurriculum } from './api/content'
import { Universe } from './galaxy/Universe'
import { useView } from './galaxy/view'
import { HomeScreen } from './screens/Home/HomeScreen'
import { MoonsScreen } from './screens/Moons/MoonsScreen'
import { MOCK_PLANET } from './screens/Moons/mockPlanet'
import type { Planet } from './screens/Moons/types'
import ConceptScreen from './screens/Concept/ConceptScreen'

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

  return (
    <div className="relative h-full overflow-hidden">
      <Universe />
      <HomeScreen />
      <MoonsScreen
        key={planet.id}
        planet={planet}
        renderConcept={(moonId, handlers) => <ConceptScreen planetId={planet.id} moonId={moonId} {...handlers} />}
      />
    </div>
  )
}
