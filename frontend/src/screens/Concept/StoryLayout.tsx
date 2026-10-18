/**
 * The "Story Scroll" layout from the prototype, for lessons whose story text comes from the backend:
 *   story (scrolls) | sticky scene, its caption and Back/Next
 * Same look and behaviour as the hand-built story lessons (story.css, storyKit's storyParts): on phones the scene
 * sticks to the top and the story scrolls under it. The quick check and "Complete moon" sit at the end of the last part.
 * The lesson supplies the scene (with its caption) and the "Try it" boxes.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import AlgoChat from './AlgoChat'
import type { Moon } from './moonApi'
import { storyParts } from './lessons/storyKit'
import './story.css'

export type LessonProps = {
  planetId: string
  moon: Moon
  onBack?: () => void
  onComplete?: (moonId: string) => void
  onOpenMoon?: (moonId: string) => void
}

type StoryLayoutProps = LessonProps & {
  /** The scene box and its caption (it stays put while the story scrolls) */
  stage: ReactNode
  /** "Try it" controls shown inside part `step` of the story */
  renderExtra?: (step: number) => ReactNode
  /** Called when a new part scrolls into view */
  onStepChange?: (active: number) => void
  /** Line next to "Complete moon", e.g. "Next up: nodes." */
  nextUp?: string
}

export default function StoryLayout({
  planetId, moon, onBack, onComplete, onOpenMoon, stage, renderExtra, onStepChange, nextUp,
}: StoryLayoutProps) {
  const [active, setActive] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const nav = useRef<ReturnType<typeof storyParts> | null>(null)
  const onStepRef = useRef(onStepChange)
  useEffect(() => { onStepRef.current = onStepChange })

  const steps = moon.dialogue_steps
  const openMoon = (id: string) => onOpenMoon?.(id)

  // Whichever part reaches the reading line becomes the active one
  useEffect(() => {
    const parts = storyParts(mainRef.current!, (k) => { setActive(k); onStepRef.current?.(k) })
    nav.current = parts
    return () => { parts.stop(); nav.current = null }
  }, [moon])

  return (
    <div className="nv cpage">
      <header className="cbar">
        {onBack && <button className="btn sm" onClick={onBack}>← Moons</button>}
        <div className="cbar-t">
          <span className="eyebrow">{planetId} · Moon {moon.order}</span>
          <h1>{moon.title}</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef}>
        <div className="i1">
          <div className="i1-story">
            <div className="prog1"><i style={{ width: `${((active + 1) / Math.max(1, steps.length)) * 100}%` }} /></div>
            {steps.map((step, i) => (
              <section key={step.id} className={`sec${active === i ? ' on' : ''}`} data-k={i}>
                <span className="secn">Part {i + 1} of {steps.length}</span>
                <h2>{step.title}</h2>
                <LessonText text={step.body} onOpenMoon={openMoon} />
                {renderExtra?.(i)}
                {i === 0 && steps.length > 1 && <p className="down">Scroll down to keep going ↓</p>}
                {i === steps.length - 1 && <QuickCheck moon={moon} nextUp={nextUp} onPass={() => onComplete?.(moon.id)} />}
              </section>
            ))}
          </div>
          <div className="i1-stage">
            {stage}
            <div className="snav">
              <button className="btn sm" disabled={active === 0} onClick={() => nav.current?.go(-1)}>← Back</button>
              <span>Part {active + 1} of {steps.length}</span>
              <button className="btn sm" disabled={active >= steps.length - 1} onClick={() => nav.current?.go(1)}>Next →</button>
            </div>
          </div>
        </div>
      </main>
      <AlgoChat planetId={planetId} moonId={moon.id} onMoonLink={openMoon} />
    </div>
  )
}

/** The quick check, like the story lessons' quiz: wrong answers can be retried; the right one shows "Complete moon" */
function QuickCheck({ moon, nextUp, onPass }: { moon: Moon; nextUp?: string; onPass: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [passed, setPassed] = useState(false)
  const { question, options, answer } = moon.check
  if (!options.length) return null
  const right = picked === answer
  const feedback = right ? `Correct! ${moon.summary}` : 'Not quite. Look back at the scene, or ask Algo, then try again.'
  const choose = (option: string) => {
    setPicked(option)
    if (option === answer) setPassed(true)
  }
  return (
    <>
      <div className="qz">
        <div className="qq">Quick check: {question}</div>
        {options.map((option) => (
          <button key={option} className={`opt${picked === option ? (right ? ' right' : ' wrong') : ''}`} onClick={() => choose(option)}>{option}</button>
        ))}
        {picked && <p className={`fb ${right ? 'ok' : 'bad'}`} aria-live="polite">{feedback}</p>}
      </div>
      {passed && (
        <div className="donebar">
          <button className="btn go" onClick={onPass}>Complete moon</button>
          {nextUp && <span className="down">{nextUp}</span>}
        </div>
      )}
    </>
  )
}

/** Lesson text: blank lines become paragraphs, **bold** works, [[moon-id]] becomes a link button. */
function LessonText({ text, onOpenMoon }: { text: string; onOpenMoon: (id: string) => void }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, p) => (
        <p key={p}>
          {para.split(/(\[\[[a-z0-9-]+\]\]|\*\*[^*]+\*\*)/g).map((part, i): ReactNode => {
            const link = part.match(/^\[\[([a-z0-9-]+)\]\]$/)
            if (link) return <button key={i} className="mlink" onClick={() => onOpenMoon(link[1])}>🌙 {link[1].replace(/-/g, ' ')}</button>
            if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
            return part
          })}
        </p>
      ))}
    </>
  )
}
