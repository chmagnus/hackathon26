/**
 * TEMPORARY: stand-in chapter panel until the real design exists (likely owned by the Concept page / app shell).
 * Lists one chapter's concepts in order; clicking one calls onSelectMoon(moonId).
 * Side panel on wide screens, bottom sheet on phones.
 */
import type { Orbit } from './types'

const EDGE = 'border border-[rgba(140,170,255,.17)]'

export interface ChapterPanelProps {
  orbit: Orbit
  /** ids of concepts the user has finished */
  completed: string[]
  onSelectMoon: (moonId: string) => void
  onClose: () => void
}

export function ChapterPanel({ orbit, completed, onSelectMoon, onClose }: ChapterPanelProps) {
  const moons = [...orbit.moons].sort((a, b) => a.order - b.order)
  const done = new Set(completed)

  return (
    <aside
      aria-label={`Chapter ${orbit.number}: ${orbit.title}`}
      className={`${EDGE} pointer-events-auto absolute z-30 flex flex-col overflow-hidden bg-glass backdrop-blur-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60%] max-sm:rounded-t-[20px] max-sm:border-b-0 sm:bottom-4 sm:right-4 sm:top-4 sm:w-[360px] sm:rounded-[20px]`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(140,170,255,.17)] px-[18px] pb-3 pt-3.5">
        <div>
          <div className="font-mono text-[11.5px] uppercase tracking-[.16em] text-mint">Chapter {orbit.number}</div>
          <h2 className="mt-0.5 font-display text-[17px] font-bold tracking-[.04em]">{orbit.title}</h2>
        </div>
        <button type="button" onClick={onClose} className={`${EDGE} shrink-0 rounded-[10px] bg-white/5 px-3 py-[7px] text-[13.5px] font-bold hover:brightness-125`}>
          Close
        </button>
      </header>
      <ol className="flex flex-col gap-2 overflow-auto p-[18px]">
        {moons.map((moon) => (
          <li key={moon.id}>
            <button
              type="button"
              onClick={() => onSelectMoon(moon.id)}
              className={`${EDGE} w-full rounded-xl bg-white/[.04] px-3 py-2.5 text-left hover:border-sky/50 hover:bg-white/[.07]`}
            >
              <span className="flex items-center justify-between gap-2">
                <b className="text-[15px]">{moon.order}. {moon.title}</b>
                {done.has(moon.id) && <span className="font-mono text-[11px] uppercase tracking-widest text-mint">✓ done</span>}
              </span>
              <span className="mt-0.5 block text-sm text-[#cdd5ea]">{moon.summary}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
