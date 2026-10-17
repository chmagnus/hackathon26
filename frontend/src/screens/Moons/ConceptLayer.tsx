/**
 * The layers of the card-expands transition (see useConceptTransition): a soft vignette that dims the 3D scene,
 * a click blocker while a transition runs, the expanding copy of the card, and the concept page itself
 * (rendered by the parent, e.g. Person C's ConceptScreen) fading in on top.
 */
import type { ReactNode } from 'react'
import { EXPAND_MS, PAGE_IN_MS, PAGE_OUT_MS, type ConceptPhase, type Ghost } from './useConceptTransition'

const EASE_OUT = 'cubic-bezier(.22,1,.36,1)'

export interface ConceptLayerProps {
  phase: ConceptPhase
  moonId: string | null
  ghost: Ghost | null
  pageShown: boolean
  dimmed: boolean
  busy: boolean
  renderPage: (moonId: string) => ReactNode
}

function GhostCard({ ghost }: { ghost: Ghost }) {
  const box = ghost.full
    ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    : ghost.card
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[45] overflow-hidden border border-[rgba(140,170,255,.17)] px-3 py-2.5 text-left font-body text-ink"
      style={{
        ...box,
        borderRadius: ghost.full ? 0 : 12,
        // from the card's glassy fill to the page's dark background
        backgroundColor: ghost.full ? '#04060e' : 'rgba(16,22,42,.97)',
        transition: ['left', 'top', 'width', 'height', 'border-radius', 'background-color']
          .map((p) => `${p} ${EXPAND_MS}ms ${EASE_OUT}`).join(', '),
      }}
    >
      <b className="block text-[15px]">{ghost.title}</b>
      <span className="mt-0.5 block text-sm text-[#cdd5ea]">{ghost.summary}</span>
    </div>
  )
}

export function ConceptLayer({ phase, moonId, ghost, pageShown, dimmed, busy, renderPage }: ConceptLayerProps) {
  return (
    <>
      {/* the scene dims behind the page (about 40%), darker towards the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[35]"
        style={{
          opacity: dimmed ? 1 : 0,
          transition: `opacity ${EXPAND_MS}ms ease-out`,
          background: 'radial-gradient(ellipse at center, rgba(3,4,10,.22) 0%, rgba(3,4,10,.45) 55%, rgba(3,4,10,.65) 100%)',
        }}
      />

      {/* no double-opens or early backs while a transition runs */}
      {busy && phase !== 'open' && <div aria-hidden className="pointer-events-auto fixed inset-0 z-[44]" />}

      {ghost && <GhostCard ghost={ghost} />}

      {moonId && (
        <div
          className="absolute inset-0 z-50"
          style={{
            opacity: pageShown ? 1 : 0,
            transition: `opacity ${pageShown ? PAGE_IN_MS : PAGE_OUT_MS}ms ease-out`,
            pointerEvents: phase === 'open' ? 'auto' : 'none',
          }}
        >
          {renderPage(moonId)}
        </div>
      )}
    </>
  )
}
