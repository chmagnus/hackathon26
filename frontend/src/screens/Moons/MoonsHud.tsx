/**
 * 2D overlay for the Planet view, ported from the prototype's moons HUD:
 * back button + planet title with chapter progress (top-left), and a hint (bottom-centre).
 * The wrapper never takes the pointer, so dragging the 3D scene works around the panels.
 */
import type { ChapterState } from './chapters'
import type { Planet } from './types'

const EDGE = 'border border-[rgba(140,170,255,.17)]'

export interface MoonsHudProps {
  planet: Planet
  /** one state per orbit, in the same order as planet.orbits */
  states: ChapterState[]
  onBack?: () => void
  onSelectChapter?: (number: number) => void
  /** hide the bottom hint (e.g. while a chapter is focused) */
  hideHint?: boolean
}

export function MoonsHud({ planet, states, onBack, onSelectChapter, hideHint }: MoonsHudProps) {
  const currentIdx = states.indexOf('current')
  const current = currentIdx >= 0 ? planet.orbits[currentIdx] : null
  const done = states.filter((s) => s === 'completed').length
  const hint = current
    ? `Click the glowing moon to continue: Chapter ${current.number}, ${current.title}`
    : done === states.length ? 'Every chapter complete' : null

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute left-4 top-3.5 flex max-w-[calc(100%-32px)] flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className={`${EDGE} rounded-[10px] bg-glass px-3 py-[7px] text-[13.5px] font-bold text-ink backdrop-blur hover:brightness-125 active:translate-y-px`}
        >
          ← Universe
        </button>
        <div className={`${EDGE} rounded-[14px] bg-glass px-3.5 py-2.5 backdrop-blur-md`}>
          <div className="font-mono text-[11.5px] uppercase tracking-[.16em] text-mint">Planet</div>
          <h2 className="mt-0.5 font-display text-[17px] font-bold tracking-[.05em]">{planet.title}</h2>
          <div className="mt-2 flex gap-[5px]" role="img" aria-label={`${done} of ${states.length} chapters complete`}>
            {states.map((s, i) => (
              <span key={i} className={`h-[5px] w-[22px] rounded-[3px] transition-colors ${s === 'completed' ? 'bg-mint' : 'bg-[rgba(151,163,194,.25)]'}`} />
            ))}
          </div>
          <nav aria-label="Chapters" className="mt-3 flex max-w-[min(420px,calc(100vw-80px))] flex-wrap gap-2">
            {planet.orbits.map((orbit, index) => <button key={orbit.number} disabled={states[index] === 'locked'} onClick={() => onSelectChapter?.(orbit.number)} className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:border-mint/50 disabled:opacity-40">{states[index] === 'locked' ? 'Locked: ' : 'Open '}{orbit.title}</button>)}
          </nav>
        </div>
      </div>

      {hint && !hideHint && (
        <div className="absolute bottom-3.5 left-1/2 w-[min(720px,calc(100%-32px))] -translate-x-1/2 text-center">
          <span className={`${EDGE} inline-block rounded-full bg-glass px-4 py-2 text-sm text-[#cdd5ea] backdrop-blur`}>{hint}</span>
        </div>
      )}
    </div>
  )
}
