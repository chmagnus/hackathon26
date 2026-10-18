/**
 * Demo panel (bottom-left of Home): finish a planet in one click so its pull into orbit can be shown
 * without doing every lesson. Shows in dev, or with ?demo in the URL; Shift+D toggles it anywhere.
 */
import { useEffect, useRef, useState } from 'react'
import type { HomePlanet, PlanetId } from './planets'

const STEP_MS = 1500 // gap between planets in "Complete all", so each pull-in can be seen

const startsShown = () => {
  if (import.meta.env.DEV) return true
  try { return new URLSearchParams(window.location.search).has('demo') } catch { return false }
}

// typing a capital D in a text box mustn't toggle the panel
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function DemoPanel({ planets, captured, hidden, onComplete, onReset }: {
  planets: HomePlanet[] // live planets only
  captured: PlanetId[]
  hidden: boolean // camera is zooming into a planet: stop any "Complete all" run
  onComplete: (id: PlanetId) => void
  onReset?: () => void // undefined when there's nothing to reset
}) {
  const [shown, setShown] = useState(startsShown)
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && e.code === 'KeyD' && !isTyping(e.target)) {
        setShown((s) => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function stopRun() {
    clearTimeout(timer.current)
    setRunning(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // leaving Home (or hiding the panel) cancels the rest of a "Complete all" run
  const [wasActive, setWasActive] = useState(true)
  const active = shown && !hidden
  if (active !== wasActive) {
    setWasActive(active)
    if (!active) setRunning(false)
  }
  useEffect(() => { if (!active) clearTimeout(timer.current) }, [active])

  const remaining = planets.filter((p) => !captured.includes(p.id))

  // captures the remaining planets one by one, STEP_MS apart
  function completeAll() {
    const queue = remaining.map((p) => p.id)
    if (!queue.length) return
    setRunning(true)
    const next = () => {
      onComplete(queue.shift()!)
      if (queue.length) timer.current = setTimeout(next, STEP_MS)
      else setRunning(false)
    }
    next()
  }

  function reset() {
    stopRun()
    onReset?.()
  }

  if (!shown) return null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open demo panel"
        className="pointer-events-auto absolute bottom-20 left-4 rounded-full border border-white/15 bg-glass px-3.5 py-1.5 font-display text-xs font-bold tracking-[.14em] text-gold backdrop-blur hover:border-gold/50 max-sm:bottom-32"
      >
        ✦ DEMO
      </button>
    )
  }

  return (
    <section aria-label="Demo controls" className="pointer-events-auto absolute bottom-20 left-4 w-[248px] rounded-2xl border border-white/15 bg-glass p-3.5 backdrop-blur max-sm:bottom-32">
      <header className="mb-2.5 flex items-center">
        <span className="font-display text-xs font-bold tracking-[.14em] text-gold">✦ DEMO</span>
        <button onClick={() => setOpen(false)} aria-label="Collapse demo panel" className="ml-auto grid size-6 place-items-center rounded-md text-lg leading-none text-muted hover:bg-white/10 hover:text-ink">
          –
        </button>
      </header>

      <ul className="flex flex-col gap-1.5">
        {planets.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-1.5 pr-1.5 pl-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
            {captured.includes(p.id) ? (
              <span className="px-2 py-1 text-xs font-bold text-mint">In orbit ✓</span>
            ) : (
              <button onClick={() => onComplete(p.id)} disabled={running} aria-label={`Complete ${p.name}`} className="rounded-lg border border-mint/40 px-2 py-1 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-40">
                Complete
              </button>
            )}
          </li>
        ))}
        {!planets.length && <li className="px-1 text-xs text-muted">No planets have lessons yet.</li>}
      </ul>

      <div className="mt-3 flex gap-2">
        <button onClick={completeAll} disabled={running || !remaining.length} className="flex-1 rounded-xl bg-mint px-3 py-2 text-sm font-bold text-[#03140e] disabled:opacity-40">
          {running ? 'Pulling in…' : 'Complete all'}
        </button>
        <button onClick={reset} disabled={!onReset} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-40">
          Reset progress
        </button>
      </div>
    </section>
  )
}
