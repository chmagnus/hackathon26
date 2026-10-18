/**
 * SCREEN 3 · CONCEPT PAGE ("Story Scroll")
 * Loads one moon's lesson and shows it as a scrolling story with a sticky interactive scene.
 * Algo's chat floats in the corner.
 *
 * Plug-in points for whoever joins the screens in App.tsx:
 *  - moonId:          which lesson to show (from MoonsScreen's onSelectMoon)
 *  - onBack():        go back to the Moons screen
 *  - onComplete(id):  the learner passed the quick check -> mark the moon done
 *  - onOpenMoon(id):  a [[moon-id]] link was clicked -> open that moon instead
 */
import { useEffect, useState, type ComponentType } from 'react'
import Algo from './Algo'
import { fetchMoon, type Moon } from './moonApi'
import type { LessonProps } from './StoryLayout'
import GenericLesson from './lessons/GenericLesson'
import HashStory from './lessons/HashStory'
import LongestChainStory from './lessons/LongestChainStory'
import ProofOfWorkStory from './lessons/ProofOfWorkStory'
import SharedLedgerStory from './lessons/SharedLedgerStory'
import SignaturesStory from './lessons/SignaturesStory'
import './story.css'

/** Moons with their own interactive scene. Anything else uses GenericLesson. */
const LESSONS: Record<string, ComponentType<LessonProps>> = {
  ledgers: SharedLedgerStory, // the prototype's Story Scroll
  hashing: HashStory, // the rest are ported from the prototype like ledgers
  'digital-signatures': SignaturesStory,
  'proof-of-work': ProofOfWorkStory,
  'forks-and-longest-chain': LongestChainStory,
}

/**
 * Story lessons ported whole from the prototype carry their own text, so they still open when the backend
 * has no data for the moon (or is down). They only need these few details (order = place in its orbit).
 * Lessons that read their story from the backend don't belong here.
 */
const STANDALONE: Record<string, { title: string; order: number }> = {
  ledgers: { title: 'A shared ledger', order: 1 },
  hashing: { title: 'Hashing', order: 2 },
  'digital-signatures': { title: 'Digital signatures', order: 4 },
  'proof-of-work': { title: 'Proof of work', order: 3 },
  'forks-and-longest-chain': { title: 'Forks and chain selection', order: 2 },
}

/** A stand-in moon with just the basics, for a standalone lesson the backend doesn't know about */
function minimalMoon(id: string, { title, order }: { title: string; order: number }): Moon {
  return { id, title, order, orbit: 0, summary: '', goal: '', body: '', dialogue_steps: [], check: { question: '', options: [], answer: '' }, nonce: 0 }
}

type ConceptScreenProps = Omit<LessonProps, 'moon' | 'planetId'> & {
  planetId?: string
  moonId: string
}

type Loaded = { moonId: string; tries: number; moon: Moon | null; error: string | null }

export default function ConceptScreen({ planetId = 'blockchain', moonId, ...handlers }: ConceptScreenProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [tries, setTries] = useState(0) // bumped by "Try again"

  useEffect(() => {
    let cancelled = false
    fetchMoon(planetId, moonId)
      .then((moon) => !cancelled && setLoaded({ moonId, tries, moon, error: null }))
      .catch((e: Error) => !cancelled && setLoaded({ moonId, tries, moon: null, error: e.message }))
    return () => { cancelled = true }
  }, [planetId, moonId, tries])

  const current = loaded?.moonId === moonId && loaded.tries === tries ? loaded : null
  // backend has nothing for this moon: a standalone lesson still opens with the basics
  const standalone = current?.error ? STANDALONE[moonId] : undefined
  const moon = current?.moon ?? (standalone ? minimalMoon(moonId, standalone) : null)

  if (!moon) {
    // a 404 means the lesson isn't written yet; anything else means the lesson server didn't answer
    const missing = !!current?.error && /\(404\)/.test(current.error)
    const title = !current ? 'Loading…' : missing ? 'Not ready yet' : "Can't reach the lessons"
    return (
      <div className="nv cpage">
        <header className="cbar">
          {handlers.onBack && <button className="btn sm" onClick={handlers.onBack}>← Moons</button>}
          <div className="cbar-t">
            <span className="eyebrow">{planetId}</span>
            <h1>{title}</h1>
          </div>
        </header>
        <main className="cmain">
          <div className="cmsg">
            <div className="cmsg-algo"><Algo mood={current ? 'idle' : 'thinking'} /></div>
            {!current && <p>Loading the lesson…</p>}
            {missing && <p>This moon's lesson isn't written yet. Check back soon!</p>}
            {current && !missing && (
              <>
                <p>Algo can't reach the lesson library right now, so this moon's story can't load.</p>
                <p className="down">If you're running Nova yourself, check that the backend is running, then try again.</p>
                <div className="row">
                  <button className="btn go" onClick={() => setTries((t) => t + 1)}>Try again</button>
                  {handlers.onBack && <button className="btn" onClick={handlers.onBack}>Back to the moons</button>}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  const Lesson = LESSONS[moon.id] ?? GenericLesson
  return <Lesson key={moon.id} planetId={planetId} moon={moon} {...handlers} />
}
