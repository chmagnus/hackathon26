/**
 * Name tag above a chapter moon, styled like the prototype's `.l3.tag`.
 * Anchored by its bottom centre to the point drei <Html> places it at. Never takes the pointer, so dragging works through it.
 */
import type { ChapterState } from './chapters'

const EDGE = 'border-[rgba(140,170,255,.17)]'

const TONE: Record<ChapterState, string> = {
  completed: `${EDGE} text-mint`,
  current: 'border-gold/50 text-gold',
  locked: `${EDGE} text-muted`,
}

const SUFFIX: Record<ChapterState, string> = {
  completed: ' · done',
  current: '',
  locked: ' · locked',
}

/**
 * Below 640px wide the ring is only a few hundred px across, so the tag shrinks and drops the state suffix
 * (the tag's colour still shows it); otherwise neighbouring tags overlap.
 */
export function ChapterLabel({ number, title, state }: { number: number; title: string; state: ChapterState }) {
  return (
    <div className={`pointer-events-none -translate-x-1/2 -translate-y-full select-none whitespace-nowrap rounded-xl border bg-[rgba(6,9,20,.78)] px-3 py-1.5 text-center font-bold transition-colors duration-300 max-sm:rounded-lg max-sm:px-2 max-sm:py-1 ${TONE[state]}`}>
      <span className="block font-mono text-[10.5px] font-normal uppercase tracking-[.12em] text-muted max-sm:text-[9px] max-sm:tracking-[.08em]">
        Chapter {number}<span className="max-sm:hidden">{SUFFIX[state]}</span>
      </span>
      <span className="text-sm max-sm:text-xs">{title}</span>
    </div>
  )
}
