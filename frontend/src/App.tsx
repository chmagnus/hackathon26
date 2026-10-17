import { useEffect, useState } from 'react'
import { fetchCurriculum, type Planet } from './api/content'
import { Universe } from './galaxy/Universe'
import { useView } from './galaxy/view'
import { HomeScreen } from './screens/Home/HomeScreen'
import { HOME_PLANETS, type PlanetId } from './screens/Home/planets'
import { ResetProgressDialog } from './screens/Home/ResetProgressDialog'
import { MoonsScreen } from './screens/Moons/MoonsScreen'
import { chapterState } from './screens/Moons/chapters'
import ConceptScreen from './screens/Concept/ConceptScreen'
import { useProgress } from './store/progress'

type Content = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; planets: Planet[] }
type OpenMoon = { planetId: string; moonId: string }
const isPlanetId = (id: string): id is PlanetId => HOME_PLANETS.some((planet) => planet.id === id)

export default function App() {
  const [content, setContent] = useState<Content>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [openMoon, setOpenMoon] = useState<OpenMoon | null>(null)
  const [lastPlanet, setLastPlanet] = useState<PlanetId>(() => {
    const initial = useView.getState().view
    return initial.mode === 'planet' ? initial.id : 'blockchain'
  })
  const [justCaptured, setJustCaptured] = useState<PlanetId | null>(null)
  const [resetRequested, setResetRequested] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const view = useView((state) => state.view)
  const setView = useView((state) => state.setView)
  const systems = useProgress((state) => state.systems)
  const captureOrder = useProgress((state) => state.captured)
  const completeMoon = useProgress((state) => state.completeMoon)
  const capturePlanet = useProgress((state) => state.capturePlanet)
  const resetProgress = useProgress((state) => state.reset)

  useEffect(() => {
    const controller = new AbortController()
    fetchCurriculum(controller.signal).then(
      (planets) => { if (!controller.signal.aborted) setContent({ status: 'ready', planets }) },
      (error: Error) => { if (!controller.signal.aborted) setContent({ status: 'error', message: error.message }) },
    )
    return () => controller.abort()
  }, [attempt])

  // Record the destination immediately: opening a chapter can interrupt the planet's
  // arrival animation, so the later camera-arrived callback is not a reliable signal.
  useEffect(() => useView.subscribe((state, previous) => {
    if (state.view !== previous.view && state.view.mode === 'planet') {
      setLastPlanet(state.view.id)
      setJustCaptured(null)
    }
  }), [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const planets = content.status === 'ready' ? content.planets : []
  const currentId = view.mode === 'planet' ? view.id : lastPlanet
  const planet = planets.find((item) => item.id === currentId)
  const completed = systems[currentId]?.completed ?? []
  const allMoons = (item: Planet) => item.orbits.flatMap((orbit) => orbit.moons)
  const eligible = planets.filter((item) => allMoons(item).length > 0 && allMoons(item).every((moon) => systems[item.id]?.completed.includes(moon.id))).map((item) => item.id)
  // Keep capture order, and support progress saved before capture order was introduced.
  const captured = [...new Set([...captureOrder, ...eligible])].filter((id) => eligible.includes(id)).filter(isPlanetId)
  const completedMoons = Object.fromEntries(planets.map((item) => [item.id, allMoons(item).filter((moon) => systems[item.id]?.completed.includes(moon.id)).length]))
  const homePlanets = HOME_PLANETS.map((visual) => {
    const data = planets.find((item) => item.id === visual.id)
    return { ...visual, live: !!data, moons: data ? allMoons(data).length : 0, name: data?.title ?? visual.name, color: data?.colour ?? visual.color }
  })

  function openLesson(planetId: string, moonId: string) {
    const data = planets.find((item) => item.id === planetId)
    const orbit = data?.orbits.find((item) => item.moons.some((moon) => moon.id === moonId))
    if (!data || !orbit) {
      setNotice('That lesson is not available on this planet.')
      return
    }
    if (chapterState(orbit, data.orbits, { completed: systems[planetId]?.completed ?? [] }) === 'locked') {
      setNotice(`Complete the earlier chapters before opening ${orbit.title}.`)
      return
    }
    setOpenMoon({ planetId, moonId })
  }

  function finishLesson(moonId: string) {
    if (!openMoon || moonId !== openMoon.moonId) return
    const data = planets.find((item) => item.id === openMoon.planetId)
    if (!data || !allMoons(data).some((moon) => moon.id === moonId)) return
    completeMoon(data.id, moonId)
    const done = new Set([...(systems[data.id]?.completed ?? []), moonId])
    setOpenMoon(null)
    if (allMoons(data).every((moon) => done.has(moon.id)) && isPlanetId(data.id)) {
      capturePlanet(data.id)
      setJustCaptured(captured.includes(data.id) ? null : data.id)
      setView({ mode: 'universe' })
      setNotice(`${data.title} complete! The planet is now in your orbit.`)
    } else {
      setNotice('Lesson complete. Your progress has been updated.')
    }
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0" inert={openMoon !== null}>
      <Universe />
      <HomeScreen planets={homePlanets} completedMoons={completedMoons} captured={captured} justCaptured={justCaptured}
        onResetProgress={Object.keys(systems).length ? () => setResetRequested(true) : undefined} />
      {planet && <MoonsScreen key={planet.id} planet={planet} progress={{ completed }} conceptOpen={!!openMoon} onSelectMoon={(moonId) => openLesson(planet.id, moonId)} />}
      {content.status !== 'ready' && (
        <section aria-label="Learning content" className="absolute bottom-28 left-1/2 z-30 w-[min(480px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-white/20 bg-glass p-5 text-center text-ink">
          <p role={content.status === 'error' ? 'alert' : 'status'}>{content.status === 'loading' ? 'Loading the learning planets…' : `${content.message} Start the backend on port 8000, then try again.`}</p>
          {content.status === 'error' && <button onClick={() => { setContent({ status: 'loading' }); setAttempt((value) => value + 1) }} className="mt-3 rounded-xl bg-mint px-4 py-2 font-bold text-void">Try again</button>}
        </section>
      )}
      </div>
      {openMoon && (
        <div className="absolute inset-0 z-50" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpenMoon(null) } }}>
          <ConceptScreen key={`${openMoon.planetId}/${openMoon.moonId}`} planetId={openMoon.planetId} moonId={openMoon.moonId}
            completed={systems[openMoon.planetId]?.completed.includes(openMoon.moonId) ?? false}
            completedMoons={systems[openMoon.planetId]?.completed ?? []}
            onBack={() => setOpenMoon(null)} onComplete={finishLesson} onOpenMoon={(id) => openLesson(openMoon.planetId, id)} />
        </div>
      )}
      {resetRequested && <ResetProgressDialog onCancel={() => setResetRequested(false)} onReset={() => { resetProgress(); setJustCaptured(null); setResetRequested(false) }} />}
      {notice && <div role="status" className="absolute left-1/2 top-4 z-[60] w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-xl border border-mint/30 bg-void px-4 py-3 text-center text-ink">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice(null)} className="ml-3">×</button></div>}
    </div>
  )
}
