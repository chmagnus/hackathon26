/**
 * The "Story Scroll" layout from the prototype:
 *   story (scrolls) | sticky scene | Algo's panel
 * The scene changes with whichever part of the story is in view.
 * On phones: the scene sticks to the top, the story scrolls under it, and Algo is an "Ask Algo" button.
 * Each lesson supplies its own scene, captions, "try it" controls and Algo comments.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import AlgoChat from './AlgoChat'
import type { Moon } from './moonApi'

export type LessonProps = {
  planetId: string
  moon: Moon
  onBack?: () => void
  onComplete?: (moonId: string) => void
  onOpenMoon?: (moonId: string) => void
  completed?: boolean
  completedMoons?: string[]
}

type StoryLayoutProps = LessonProps & {
  /** What the scene shows for part `active` (the last index is the quick check) */
  renderStage: (active: number) => ReactNode
  /** Line under the scene */
  caption?: (active: number) => string
  /** "Try it" controls shown inside part `step` of the story */
  renderExtra?: (step: number) => ReactNode
  /** Called when a new part scrolls into view (start animations here) */
  onStepChange?: (active: number) => void
  /** Algo's speech bubble for part `active` */
  algoSays?: (active: number) => string
}

export default function StoryLayout({
  planetId, moon, onBack, onComplete, onOpenMoon, completed, completedMoons, renderStage, caption, renderExtra, onStepChange, algoSays,
}: StoryLayoutProps) {
  const [active, setActive] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onStepRef = useRef(onStepChange)
  useEffect(() => { onStepRef.current = onStepChange })

  const steps = moon.dialogue_steps
  const total = steps.length + 1 // story parts + the quick check
  const openMoon = (id: string) => onOpenMoon?.(id)

  // Whichever part crosses the middle of the screen becomes the active one
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    let current = -1
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return
        const k = Number((e.target as HTMLElement).dataset.k)
        if (k === current) return
        current = k
        setActive(k)
        onStepRef.current?.(k)
      }),
      { root, rootMargin: '-35% 0px -55% 0px' },
    )
    root.querySelectorAll('[data-k]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [moon])

  const progress = ((active + 1) / total) * 100
  const say = algoSays?.(active) ?? "Scroll down and I'll walk you through it. Ask me anything on the way!"
  const reaction = useMemo(() => ({ text: say, key: active }), [say, active])

  function goTo(index: number) {
    const section = scrollRef.current?.querySelector<HTMLElement>(`[data-k="${index}"]`)
    section?.scrollIntoView({ behavior: 'instant', block: 'start' })
    setActive(index)
    onStepRef.current?.(index)
  }

  return (
    <div className="flex h-full flex-col bg-void text-ink">
      {/* Top bar */}
      <header className="flex items-center gap-5 border-b border-white/10 px-5 py-4">
        {onBack && (
          <button autoFocus onClick={onBack} className="rounded-xl border border-white/15 px-4 py-2 font-bold cursor-pointer hover:border-white/40">
            ← Moons
          </button>
        )}
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
            {planetId} · Moon {moon.order}
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-wide">{moon.title}</h1>
          {completed && <p className="text-sm text-mint">✓ Completed</p>}
        </div>
      </header>
      <div className="h-1 bg-white/5 lg:hidden">
        <div className="h-full bg-mint transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <nav aria-label="Lesson parts" className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-2 text-sm">
        <button disabled={active === 0} onClick={() => goTo(active - 1)} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-40">← Previous</button>
        <span className="text-muted">{active < steps.length ? `Part ${active + 1} of ${steps.length}` : 'Checkpoint'}</span>
        <button disabled={active === steps.length} onClick={() => goTo(active + 1)} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-40">{active === steps.length - 1 ? 'Try checkpoint →' : 'Next →'}</button>
        <button onClick={() => goTo(steps.length)} className="ml-auto rounded-lg border border-mint/30 px-3 py-1.5 text-mint">Go to checkpoint</button>
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* Story + scene (this part scrolls) */}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-9 lg:px-8">
            {/* Scene */}
            <aside className="sticky top-0 z-10 self-start bg-void pb-2 lg:order-last lg:bg-transparent lg:pt-6">
              <div className="relative h-[250px] overflow-hidden border-y border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(124,196,255,.08),transparent_65%)] lg:h-[400px] lg:rounded-[20px] lg:border">
                {renderStage(active)}
              </div>
              {caption && <p className="mt-2 hidden min-h-[1.5em] text-center text-[15px] text-muted lg:block">{caption(active)}</p>}
            </aside>

            {/* Story */}
            <main className="px-5 pb-[40vh] lg:px-0 lg:pt-6">
              <div className="sticky top-0 z-[5] mb-6 hidden h-1 rounded bg-white/5 lg:block">
                <div className="h-full rounded bg-mint transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              {steps.map((step, i) => (
                <Section key={step.id} k={i} active={active === i} label={`Part ${i + 1} of ${steps.length}`} title={step.title}>
                  <LessonText text={step.body} onOpenMoon={openMoon} />
                  {i === 0 && <p className="text-sm text-muted">Scroll down to keep going ↓</p>}
                  {renderExtra?.(i)}
                </Section>
              ))}

              <Section k={steps.length} active={active === steps.length} label="Quick check" title={moon.check.question}>
                <QuickCheck check={moon.check} onPass={() => onComplete?.(moon.id)} />
              </Section>
            </main>
          </div>
        </div>

      </div>

      <AlgoChat planetId={planetId} moonId={moon.id} suggested={moon.suggested} completed={completedMoons} onMoonLink={openMoon} reaction={reaction} />
    </div>
  )
}

function Section({ k, active, label, title, children }: { k: number; active: boolean; label: string; title: string; children: ReactNode }) {
  return (
    <section data-k={k} className={`scroll-mt-[260px] py-6 transition-opacity duration-500 lg:min-h-[72vh] lg:scroll-mt-0 ${active ? 'opacity-100' : 'lg:opacity-35'}`}>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-mint">{label}</p>
      <h2 className="mb-4 font-display text-[22px] font-semibold leading-snug tracking-wide">{title}</h2>
      <div className="space-y-4 text-[17px] leading-relaxed text-ink/90">{children}</div>
    </section>
  )
}

/** Inline quick check. Wrong answers can be retried; the answer is never revealed. */
function QuickCheck({ check, onPass }: { check: Moon['check']; onPass: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const correct = picked === check.answer
  return (
    <div>
      <div className="flex flex-col gap-2">
        {check.options.map((option) => {
          const chosen = picked === option
          const style = chosen ? (correct ? 'border-mint bg-mint/10' : 'border-coral bg-coral/10') : 'border-white/15 hover:border-white/40'
          return (
            <button key={option} onClick={() => !correct && setPicked(option)} className={`rounded-xl border px-4 py-3 text-left text-base cursor-pointer transition-colors ${style}`}>
              {option}
            </button>
          )
        })}
      </div>
      {picked && !correct && <p role="status" className="mt-3 text-[15px] text-coral">Not quite. Look back at the scene, or ask Algo, then try again.</p>}
      {correct && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="status" className="text-[15px] text-mint">Correct!</p>
          <button onClick={onPass} className="rounded-xl bg-mint px-5 py-2.5 font-bold text-void cursor-pointer">Complete moon</button>
        </div>
      )}
    </div>
  )
}

/** Markdown code blocks and internal lesson links use the same API-authored text. */
function LessonText({ text, onOpenMoon }: { text: string; onOpenMoon: (id: string) => void }) {
  const markdown = text.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id: string) => `[${id.replaceAll('-', ' ')}](#moon-${id})`)
  return <div className="space-y-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/15 [&_pre]:bg-black/30 [&_pre]:p-4 [&_pre]:text-sm [&_code]:font-mono [&_ul]:list-inside [&_ul]:list-disc">
    <ReactMarkdown components={{ a: ({ href, children }) => href?.startsWith('#moon-')
      ? <button onClick={() => onOpenMoon(href.slice(6))} className="mx-0.5 rounded-full border border-gold/50 px-2 text-[15px] text-gold hover:bg-gold/10">🌙 {children}</button>
      : <a href={href} className="text-sky underline">{children}</a> }}>{markdown}</ReactMarkdown>
  </div>
}

/** Inline "try it" box inside the story, like the prototype. */
export function TryIt({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[15px]">
      {children}
    </div>
  )
}
