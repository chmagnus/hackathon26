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
import { fetchMoon, type Moon } from './moonApi'
import type { LessonProps } from './StoryLayout'
import GenericLesson from './lessons/GenericLesson'
import HashingLesson from './lessons/HashingLesson'
import SharedLedgerStory from './lessons/SharedLedgerStory'

/** Moons with their own interactive scene. Anything else uses GenericLesson. */
const LESSONS: Record<string, ComponentType<LessonProps>> = {
  ledgers: SharedLedgerStory, // the prototype's Story Scroll
  hashing: HashingLesson,
}

type ConceptScreenProps = Omit<LessonProps, 'moon' | 'planetId'> & {
  planetId?: string
  moonId: string
}

type Loaded = { moonId: string; moon: Moon | null; error: string | null }

export default function ConceptScreen({ planetId = 'blockchain', moonId, ...handlers }: ConceptScreenProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMoon(planetId, moonId)
      .then((moon) => !cancelled && setLoaded({ moonId, moon, error: null }))
      .catch((e: Error) => !cancelled && setLoaded({ moonId, moon: null, error: e.message }))
    return () => { cancelled = true }
  }, [planetId, moonId])

  const current = loaded?.moonId === moonId ? loaded : null

  if (!current?.moon) {
    return (
      <div className="flex h-full flex-col bg-void text-ink">
        <header className="flex items-center gap-5 border-b border-white/10 px-5 py-4">
          {handlers.onBack && (
            <button onClick={handlers.onBack} className="rounded-xl border border-white/15 px-4 py-2 font-bold cursor-pointer hover:border-white/40">
              ← Moons
            </button>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-wide">{current?.error ? 'Not ready yet' : 'Loading…'}</h1>
        </header>
        <p className="px-5 py-20 text-center text-muted">
          {current?.error ? "This moon's lesson isn't written yet. Check back soon!" : 'Loading the lesson…'}
        </p>
      </div>
    )
  }

  const Lesson = LESSONS[current.moon.id] ?? GenericLesson
  return <Lesson key={current.moon.id} planetId={planetId} moon={current.moon} {...handlers} />
}
