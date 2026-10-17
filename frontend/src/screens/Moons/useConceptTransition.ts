/**
 * Opening a concept page from the chapter panel, and coming back ("card expands", true FLIP):
 *  open:  a full-page surface starts transformed onto the clicked card (translate + scale) and animates to identity
 *         (EXPAND_MS, ease-out) while the other cards slide away, the scene dims and the camera eases closer to the
 *         moon; then the page, already mounted and rendered underneath, fades in (PAGE_IN_MS).
 *  close: the page fades out over the surface, which animates back onto the card and fades into it; the other cards
 *         return, the dimming lifts and the camera eases back. A concept completed on the page lands with a mint glow.
 *
 * Only transform and opacity animate, set straight on the DOM through refs (CSS transitions): React state changes
 * only at the start and end of each phase, never per frame. The page is pre-mounted (hidden) when a card is hovered,
 * focused or pressed, so it has fetched and rendered before the expansion starts.
 * Clicks are ignored while either is running. With reduced motion it's a plain 150 ms crossfade.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REDUCED_MOTION, useView } from '../../galaxy/view'
import { fetchMoon } from '../Concept/moonApi'
import type { Moon } from './types'

const EXPAND_MS = 400
const PAGE_IN_MS = REDUCED_MOTION ? 150 : 200
const PAGE_OUT_MS = 150
const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)'
const GLOW_MS = 1200
/** the copy fades in over the card at the start of the expand (hiding its square corners) and out at the end of the shrink */
const GHOST_FADE_MS = 140
/** longest we wait for a pre-mounted page to finish loading before expanding anyway */
const READY_TIMEOUT_MS = 800

export type ConceptPhase = 'closed' | 'opening' | 'open' | 'closing'

export interface ConceptHandlers {
  onBack: () => void
  onComplete: (moonId: string) => void
  onOpenMoon: (moonId: string) => void
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** transform that puts a full-viewport box exactly onto `r` (origin top-left) */
function onto(r: DOMRect) {
  return `translate(${r.left}px, ${r.top}px) scale(${r.width / window.innerWidth}, ${r.height / window.innerHeight})`
}

export function useConceptTransition({ planetId, moons, onCompleted }: {
  planetId: string
  /** the focused chapter's concepts */
  moons: Moon[]
  /** a concept was completed on the page */
  onCompleted: (moonId: string) => void
}) {
  const [phase, setPhaseState] = useState<ConceptPhase>('closed')
  /** concept whose page is mounted (hidden until opened) */
  const [moonId, setMoonId] = useState<string | null>(null)
  /** card the page opened from (and shrinks back into) */
  const [cardId, setCardIdState] = useState<string | null>(null)
  /** cards away + scene dimmed: one state flip at the start and end of the transition */
  const [expanded, setExpanded] = useState(false)
  const [glowId, setGlowId] = useState<string | null>(null)
  const setReading = useView((s) => s.setReading)

  /** the moving full-page surface and the page wrapper; styled only through these refs */
  const ghostRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // refs mirror state for the handlers and async steps
  const phaseRef = useRef<ConceptPhase>('closed')
  const cardRef = useRef<string | null>(null)
  const mounted = useRef<{ id: string; ready: Promise<unknown> } | null>(null)
  const moonsRef = useRef(moons)
  const completedRef = useRef(onCompleted)
  useEffect(() => { moonsRef.current = moons; completedRef.current = onCompleted })
  const setPhase = (p: ConceptPhase) => { phaseRef.current = p; setPhaseState(p) }
  const currentPhase = () => phaseRef.current
  const setCardId = (id: string | null) => { cardRef.current = id; setCardIdState(id) }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  /**
   * Mount a concept's page (hidden) ahead of time, so it fetches and renders before any animation.
   * `ready` settles when its data has loaded (same request the page makes) and it has had two frames to render.
   */
  const premount = useCallback((id: string) => {
    if (mounted.current?.id === id) return mounted.current.ready
    setMoonId(id)
    const ready = Promise.allSettled([fetchMoon(planetId, id)]).then(nextFrame).then(nextFrame)
    mounted.current = { id, ready }
    return ready
  }, [planetId])

  /** a card was hovered, focused or pressed: get its page ready */
  const preview = useCallback((id: string) => {
    if (phaseRef.current === 'closed') premount(id)
  }, [premount])

  const open = useCallback(async (id: string, rect: DOMRect) => {
    if (phaseRef.current !== 'closed') return
    setPhase('opening')
    setCardId(id)
    await Promise.race([premount(id), wait(READY_TIMEOUT_MS)])
    const g = ghostRef.current, p = pageRef.current
    // (read through a function: the phase may have changed while waiting)
    if (currentPhase() !== 'opening' || !g || !p) return

    p.style.visibility = 'visible'
    p.style.willChange = 'opacity'
    if (REDUCED_MOTION) {
      p.style.transition = `opacity ${PAGE_IN_MS}ms ease-out`
      p.style.opacity = '1'
      later(() => { p.style.willChange = ''; p.style.pointerEvents = 'auto'; setPhase('open') }, PAGE_IN_MS)
      return
    }

    setExpanded(true)
    setReading(true)
    // FLIP: First = the card, Last = the full page. Start inverted onto the card, then play to identity.
    g.style.transition = 'none'
    g.style.transform = onto(rect)
    g.style.opacity = '0'
    g.style.visibility = 'visible'
    g.style.willChange = 'transform, opacity'
    g.getBoundingClientRect() // commit the start state before turning the transition on
    g.style.transition = `transform ${EXPAND_MS}ms ${EASE_OUT}, opacity ${GHOST_FADE_MS}ms linear`
    g.style.transform = 'none'
    g.style.opacity = '1'

    later(() => {
      p.style.transition = `opacity ${PAGE_IN_MS}ms ease-out`
      p.style.opacity = '1'
    }, EXPAND_MS)
    later(() => {
      g.style.visibility = 'hidden'
      g.style.willChange = ''
      p.style.willChange = ''
      p.style.pointerEvents = 'auto'
      setPhase('open')
    }, EXPAND_MS + PAGE_IN_MS)
  }, [premount, setReading])

  const close = useCallback((completedId?: string) => {
    const g = ghostRef.current, p = pageRef.current
    if (phaseRef.current !== 'open' || !g || !p) return
    if (completedId) completedRef.current(completedId)
    const id = cardRef.current
    setPhase('closing')
    setExpanded(false)
    setReading(false)

    p.style.pointerEvents = 'none'
    p.style.willChange = 'opacity'
    p.style.transition = `opacity ${PAGE_OUT_MS}ms ease-out`
    p.style.opacity = '0'

    const finish = () => {
      g.style.visibility = 'hidden'
      g.style.willChange = ''
      p.style.visibility = 'hidden'
      p.style.willChange = ''
      mounted.current = null
      setMoonId(null)
      setCardId(null)
      setPhase('closed')
      if (completedId && completedId === id) {
        setGlowId(id)
        later(() => setGlowId(null), GLOW_MS)
      }
    }

    const card = id ? document.querySelector(`[data-concept-card="${id}"]`) : null
    if (REDUCED_MOTION || !card) {
      later(finish, PAGE_OUT_MS)
      return
    }
    // the full-page surface sits under the fading page, then plays back onto the card and fades into it
    g.style.transition = 'none'
    g.style.transform = 'none'
    g.style.opacity = '1'
    g.style.visibility = 'visible'
    g.style.willChange = 'transform, opacity'
    later(() => {
      g.style.transition = `transform ${EXPAND_MS}ms ${EASE_OUT}, opacity ${GHOST_FADE_MS}ms linear ${EXPAND_MS - GHOST_FADE_MS}ms`
      g.style.transform = onto(card.getBoundingClientRect())
      g.style.opacity = '0'
    }, PAGE_OUT_MS)
    later(finish, PAGE_OUT_MS + EXPAND_MS)
  }, [setReading])

  /** a [[moon-id]] link on the page: show that concept instead (it shrinks back into its own card if it's in this chapter) */
  const switchTo = useCallback((id: string) => {
    if (phaseRef.current !== 'open') return
    mounted.current = { id, ready: Promise.resolve() }
    setMoonId(id)
    if (moonsRef.current.some((m) => m.id === id)) setCardId(id)
  }, [])

  // stable, so the page isn't re-rendered whenever this screen re-renders
  const handlers = useMemo<ConceptHandlers>(() => ({
    onBack: () => close(),
    onComplete: (id) => close(id),
    onOpenMoon: switchTo,
  }), [close, switchTo])

  return {
    phase, moonId, glowId, handlers, open, close, preview, ghostRef, pageRef,
    /** for the chapter panel: the card the page grows from stays put while the others slide away */
    expandingId: REDUCED_MOTION ? null : cardId,
    away: !REDUCED_MOTION && expanded,
    busy: phase !== 'closed',
    /** dim the scene behind the page */
    dimmed: !REDUCED_MOTION && expanded,
  }
}
