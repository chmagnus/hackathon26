/**
 * Opening a concept page from the chapter panel, and coming back ("card expands", FLIP-style):
 *  open:  a copy of the clicked card grows from its spot to the full page (EXPAND_MS, ease-out) while the other
 *         cards slide away, the scene dims and the camera eases closer to the moon; then the page fades in on top.
 *  close: the page fades out over the full-size copy, which shrinks back into its card; the other cards return,
 *         the dimming lifts and the camera eases back. A concept completed on the page lands with a mint glow.
 * Clicks are ignored while either is running. With reduced motion it's a plain 150 ms crossfade.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { REDUCED_MOTION, useView } from '../../galaxy/view'
import type { Moon } from './types'

export const EXPAND_MS = 450
export const PAGE_IN_MS = REDUCED_MOTION ? 150 : 220
export const PAGE_OUT_MS = 150
const GLOW_MS = 1200

export type ConceptPhase = 'closed' | 'opening' | 'open' | 'closing'

export interface ConceptHandlers {
  onBack: () => void
  onComplete: (moonId: string) => void
  onOpenMoon: (moonId: string) => void
}

export interface Rect { left: number; top: number; width: number; height: number }

/** The stand-in card that grows into the page (and shrinks back). */
export interface Ghost {
  title: string
  summary: string
  /** the card's spot in the panel */
  card: Rect
  /** true: full page size; false: the card's size */
  full: boolean
}

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height })

export function useConceptTransition({ moons, onCompleted }: {
  /** the focused chapter's concepts (to label the expanding card) */
  moons: Moon[]
  /** a concept was completed on the page */
  onCompleted: (moonId: string) => void
}) {
  const [phase, setPhaseState] = useState<ConceptPhase>('closed')
  /** concept shown on the page */
  const [moonId, setMoonId] = useState<string | null>(null)
  /** card the page opened from (and shrinks back into) */
  const [cardId, setCardIdState] = useState<string | null>(null)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [pageShown, setPageShown] = useState(false)
  const [glowId, setGlowId] = useState<string | null>(null)
  const setReading = useView((s) => s.setReading)

  // refs mirror state for the handlers, which the page may call from stale closures
  const phaseRef = useRef<ConceptPhase>('closed')
  const cardRef = useRef<string | null>(null)
  const moonsRef = useRef(moons)
  const completedRef = useRef(onCompleted)
  useEffect(() => { moonsRef.current = moons; completedRef.current = onCompleted })
  const setPhase = (p: ConceptPhase) => { phaseRef.current = p; setPhaseState(p) }
  const setCardId = (id: string | null) => { cardRef.current = id; setCardIdState(id) }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const describe = (id: string) => {
    const m = moonsRef.current.find((x) => x.id === id)
    return { title: m ? `${m.order}. ${m.title}` : '', summary: m?.summary ?? '' }
  }

  const open = useCallback((id: string, rect: DOMRect) => {
    if (phaseRef.current !== 'closed') return
    setPhase('opening')
    setMoonId(id)
    setCardId(id)
    setPageShown(false)
    if (REDUCED_MOTION) {
      requestAnimationFrame(() => setPageShown(true))
      later(() => setPhase('open'), PAGE_IN_MS)
      return
    }
    setReading(true)
    setGhost({ ...describe(id), card: toRect(rect), full: false })
    // let the copy render at the card's size first, then grow it
    requestAnimationFrame(() => requestAnimationFrame(() => setGhost((g) => g && { ...g, full: true })))
    later(() => setPageShown(true), EXPAND_MS)
    later(() => { setGhost(null); setPhase('open') }, EXPAND_MS + PAGE_IN_MS)
  }, [setReading])

  const close = useCallback((completedId?: string) => {
    if (phaseRef.current !== 'open') return
    if (completedId) completedRef.current(completedId)
    const id = cardRef.current
    setPhase('closing')
    setReading(false)
    setPageShown(false)
    const finish = () => {
      setGhost(null)
      setMoonId(null)
      setCardId(null)
      setPhase('closed')
      if (completedId && completedId === id) {
        setGlowId(id)
        later(() => setGlowId(null), GLOW_MS)
      }
    }
    const card = id ? document.querySelector(`[data-concept-card="${id}"]`) : null
    if (REDUCED_MOTION || !id || !card) {
      later(finish, PAGE_OUT_MS)
      return
    }
    // full-size copy under the fading page, then shrink it into the card
    setGhost({ ...describe(id), card: toRect(card.getBoundingClientRect()), full: true })
    later(() => setGhost((g) => g && { ...g, full: false }), PAGE_OUT_MS)
    later(finish, PAGE_OUT_MS + EXPAND_MS)
  }, [setReading])

  /** a [[moon-id]] link on the page: show that concept instead (it shrinks back into its own card if it's in this chapter) */
  const switchTo = useCallback((id: string) => {
    if (phaseRef.current !== 'open') return
    setMoonId(id)
    if (moonsRef.current.some((m) => m.id === id)) setCardId(id)
  }, [])

  const handlers: ConceptHandlers = {
    onBack: () => close(),
    onComplete: (id) => close(id),
    onOpenMoon: switchTo,
  }

  return {
    phase, moonId, ghost, pageShown, glowId, handlers, open, close,
    /** for the chapter panel */
    expandingId: REDUCED_MOTION ? null : cardId,
    away: !REDUCED_MOTION && (phase === 'opening' || phase === 'open'),
    busy: phase !== 'closed',
    /** dim the scene behind the page */
    dimmed: !REDUCED_MOTION && (phase === 'opening' || phase === 'open'),
  }
}
