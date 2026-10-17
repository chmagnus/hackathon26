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
  /** hide the bottom hint (e.g. while a chapter is focused) */
  hideHint?: boolean
  /** index (into planet.orbits) where the chain first breaks, or null */
  brokenFrom: number | null
  /** TEMPORARY dev controls: shown only when passed */
  onDevTamper?: (brokenFrom: number | null) => void
}

export function MoonsHud({ planet, states, onBack, hideHint, brokenFrom, onDevTamper }: MoonsHudProps) {
  const currentIdx = states.indexOf('current')
  const current = currentIdx >= 0 ? planet.orbits[currentIdx] : null
  const done = states.filter((s) => s === 'completed').length
  const broken = brokenFrom !== null ? planet.orbits[brokenFrom] : null
  const hint = broken
    ? `Chain broken at Chapter ${broken.number}: every chapter after it no longer matches the record.`
    : current
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
        </div>
      </div>

      {hint && !hideHint && (
        <div className="absolute bottom-3.5 left-1/2 w-[min(720px,calc(100%-32px))] -translate-x-1/2 text-center">
          <span className={`${EDGE} inline-block rounded-full bg-glass px-4 py-2 text-sm backdrop-blur transition-colors ${broken ? 'border-coral/50 text-coral' : 'text-[#cdd5ea]'}`}>{hint}</span>
        </div>
      )}

      {/* TEMPORARY dev controls for testing the tamper animation until the real /verify result is wired in */}
      {onDevTamper && (
        <div className="pointer-events-auto absolute bottom-3.5 right-4 flex flex-col items-end gap-1.5 max-lg:bottom-16">
          {[0, 1].map((i) => (
            <button key={i} type="button" onClick={() => onDevTamper(i)}
              className="rounded-lg border border-dashed border-coral/60 bg-black/60 px-3 py-1.5 font-mono text-xs text-coral hover:bg-black/80">
              DEV: Tamper chapter {planet.orbits[i]?.number ?? i + 1}
            </button>
          ))}
          <button type="button" onClick={() => onDevTamper(null)}
            className="rounded-lg border border-dashed border-gold/60 bg-black/60 px-3 py-1.5 font-mono text-xs text-gold hover:bg-black/80">
            DEV: Reset
          </button>
        </div>
      )}
    </div>
  )
}
