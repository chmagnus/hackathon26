/**
 * TEMPORARY: stand-in chapter panel until the real design exists (likely owned by the Concept page / app shell).
 * Lists one chapter's concepts in order; clicking one calls onSelectMoon(moonId, cardRect).
 * Side panel on wide screens, bottom sheet on phones.
 *
 * Transition into a concept page (driven by MoonsScreen): a surface grows out of the clicked card (`expandingId`,
 * which stays put), the other cards fade and slide away (`away`), and when the page closes they come back.
 * A card that was just completed lands with a short mint glow (`glowId`). Hovering, focusing or pressing a card
 * calls `onPreview` so its page can be loaded before the click.
 */
import type { Orbit } from './types'

const EDGE = 'border border-[rgba(140,170,255,.17)]'

export interface ChapterPanelProps {
  orbit: Orbit
  /** ids of concepts the user has finished */
  completed: string[]
  /** `rect`: where the clicked card is on screen, for the card-expands transition */
  onSelectMoon: (moonId: string, rect: DOMRect) => void
  onClose: () => void
  /** a card was hovered, focused or pressed (load its page ahead of the click) */
  onPreview?: (moonId: string) => void
  /** the card the concept page grows out of: stays in place while the others slide away */
  expandingId?: string | null
  /** the other cards are out of the way while a concept page opens or is open */
  away?: boolean
  /** card that just got completed: short mint glow */
  glowId?: string | null
  /** a transition is running or a concept page is open: ignore clicks, and drop the backdrop blur (a plain fill
   *  instead), since blurring the moving 3D scene behind it every frame is what makes transitions stutter */
  busy?: boolean
}

export function ChapterPanel({ orbit, completed, onSelectMoon, onClose, onPreview, expandingId = null, away = false, glowId = null, busy = false }: ChapterPanelProps) {
  const moons = [...orbit.moons].sort((a, b) => a.order - b.order)
  const done = new Set(completed)

  return (
    <aside
      aria-label={`Chapter ${orbit.number}: ${orbit.title}`}
      className={`${EDGE} pointer-events-auto absolute z-30 flex flex-col overflow-hidden ${busy ? 'bg-[rgba(9,13,28,.95)]' : 'bg-glass backdrop-blur-lg'} max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60%] max-sm:rounded-t-[20px] max-sm:border-b-0 sm:bottom-4 sm:right-4 sm:top-4 sm:w-[360px] sm:rounded-[20px]`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(140,170,255,.17)] px-[18px] pb-3 pt-3.5">
        <div>
          <div className="font-mono text-[11.5px] uppercase tracking-[.16em] text-mint">Chapter {orbit.number}</div>
          <h2 className="mt-0.5 font-display text-[17px] font-bold tracking-[.04em]">{orbit.title}</h2>
        </div>
        <button type="button" onClick={() => { if (!busy) onClose() }} className={`${EDGE} shrink-0 rounded-[10px] bg-white/5 px-3 py-[7px] text-[13.5px] font-bold hover:brightness-125`}>
          Close
        </button>
      </header>
      <ol className="flex flex-col gap-2 overflow-auto p-[18px]">
        {moons.map((moon, i) => {
          const expanding = moon.id === expandingId
          const hidden = away && !expanding
          return (
            <li key={moon.id}>
              <button
                type="button"
                data-concept-card={moon.id}
                onClick={(e) => { if (!busy) onSelectMoon(moon.id, e.currentTarget.getBoundingClientRect()) }}
                onPointerEnter={() => onPreview?.(moon.id)}
                onPointerDown={() => onPreview?.(moon.id)}
                onFocus={() => onPreview?.(moon.id)}
                // slide away one after another, and come back in the same order
                style={{ transitionDelay: hidden ? `${i * 40}ms` : `${i * 40 + 120}ms` }}
                className={`${EDGE} w-full rounded-xl bg-white/[.04] px-3 py-2.5 text-left transition-[opacity,transform,box-shadow,border-color] duration-300 ease-out hover:border-sky/50 hover:bg-white/[.07] motion-reduce:transition-none ${
                  hidden ? 'translate-x-6 opacity-0' : ''
                } ${away ? 'will-change-[transform,opacity]' : ''} ${glowId === moon.id ? 'border-mint! shadow-[0_0_24px_rgba(111,242,197,.55)]' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <b className="text-[15px]">{moon.order}. {moon.title}</b>
                  {done.has(moon.id) && <span className="font-mono text-[11px] uppercase tracking-widest text-mint">✓ done</span>}
                </span>
                <span className="mt-0.5 block text-sm text-[#cdd5ea]">{moon.summary}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
