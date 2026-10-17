/**
 * The layers of the card-expands transition (see useConceptTransition): a soft vignette that dims the 3D scene,
 * a click blocker while a transition runs, the full-page surface that FLIPs between the card and the page, and the
 * page itself (rendered by the parent, e.g. Person C's ConceptScreen).
 *
 * The surface and the page wrapper are always mounted with fixed initial styles; useConceptTransition animates them
 * through refs (transform/opacity only), so React never touches them mid-animation.
 */
import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { ConceptPhase } from './useConceptTransition'

const GHOST_STYLE: CSSProperties = {
  visibility: 'hidden',
  opacity: 0,
  transformOrigin: '0 0',
  // between the card's glassy fill and the page background; no border/radius (they'd stretch while scaling)
  backgroundColor: '#070b18',
}
const PAGE_STYLE: CSSProperties = { visibility: 'hidden', opacity: 0, pointerEvents: 'none' }
const VIGNETTE = 'radial-gradient(ellipse at center, rgba(3,4,10,.22) 0%, rgba(3,4,10,.45) 55%, rgba(3,4,10,.65) 100%)'

export interface ConceptLayerProps {
  phase: ConceptPhase
  dimmed: boolean
  busy: boolean
  ghostRef: RefObject<HTMLDivElement | null>
  pageRef: RefObject<HTMLDivElement | null>
  /** the concept page (already memoized by the caller), or null */
  page: ReactNode
}

export function ConceptLayer({ phase, dimmed, busy, ghostRef, pageRef, page }: ConceptLayerProps) {
  return (
    <>
      {/* the scene dims behind the page (about 40%), darker towards the edges. Plain overlay, no blur. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[35] transition-opacity duration-[400ms] ease-out"
        style={{ opacity: dimmed ? 1 : 0, background: VIGNETTE }}
      />

      {/* no double-opens or early backs while a transition runs */}
      {busy && phase !== 'open' && <div aria-hidden className="pointer-events-auto fixed inset-0 z-[44]" />}

      <div ref={ghostRef} aria-hidden className="pointer-events-none fixed inset-0 z-[45]" style={GHOST_STYLE} />

      {/* the page is mounted (hidden) before the expand starts, so nothing loads or renders mid-animation */}
      <div ref={pageRef} className="absolute inset-0 z-50" style={PAGE_STYLE}>
        {page}
      </div>
    </>
  )
}
