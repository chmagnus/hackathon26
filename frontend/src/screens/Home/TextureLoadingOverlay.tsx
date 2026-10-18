import { useEffect } from 'react'
import { useProgress } from '@react-three/drei'

const FADE_MS = 700

/** The one overlay on the page, shared by every Suspense fallback that is showing. */
let overlay: { el: HTMLDivElement; unsubscribe: () => void } | null = null
/** How many fallbacks are showing; the overlay fades out once the last one is done. */
let waiting = 0
let removeTimer: ReturnType<typeof setTimeout> | undefined

function show() {
  clearTimeout(removeTimer)
  if (overlay) {
    overlay.el.style.opacity = ''
    return
  }
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.className = 'fixed inset-0 z-50 grid place-items-center bg-void font-body text-ink transition-opacity duration-700'
  el.innerHTML = `
    <div class="flex w-[min(280px,calc(100vw-32px))] flex-col items-center gap-4">
      <span class="font-display text-3xl font-extrabold tracking-[.08em]">NOVA</span>
      <div class="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
        <div data-bar class="h-full w-0 rounded-full bg-mint transition-[width] duration-300"></div>
      </div>
      <span data-label class="font-mono text-[11px] uppercase tracking-[.16em] text-muted">Loading the universe</span>
    </div>`
  const bar = el.querySelector<HTMLElement>('[data-bar]')!
  const label = el.querySelector<HTMLElement>('[data-label]')!
  const update = ({ progress }: { progress: number }) => {
    bar.style.width = `${progress}%`
    label.textContent = `Loading the universe · ${Math.round(progress)}%`
  }
  update(useProgress.getState())
  overlay = { el, unsubscribe: useProgress.subscribe(update) }
  document.body.appendChild(el)
}

function hide() {
  if (!overlay) return
  const { el, unsubscribe } = overlay
  el.style.opacity = '0'
  removeTimer = setTimeout(() => {
    unsubscribe()
    el.remove()
    overlay = null
  }, FADE_MS)
}

/**
 * Suspense fallback for everything that loads image textures (planets, ring, moons, sky). However many are loading,
 * one branded overlay with a progress bar covers the page until the last is ready, then fades out, so nothing pops
 * in. It renders inside the canvas, so it adds its element to the page by hand rather than rendering DOM.
 */
export function TextureLoadingOverlay() {
  useEffect(() => {
    waiting++
    show()
    return () => {
      waiting--
      if (waiting === 0) hide()
    }
  }, [])
  return null
}
