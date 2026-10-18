/**
 * Shared bits for the moon scenes that GenericLesson shows next to the backend's story text (one file per moon).
 * A scene draws into the sticky stage on the right and fills a "Try it" box inside each part of the story.
 * Styles live in ../../story.css (classes starting with "gs-").
 */
import { esc, sha256 } from '../storyKit'

export { esc, sha256 }

export type Ctx = {
  /** false when the learner asked for reduced motion: skip step-by-step animations */
  motion: boolean
}

export type MoonScene = {
  /** part `k` of the story is in view (the quick check sits in the last part) */
  show(k: number): void
  /** fill part `k`'s "Try it" box; leave it empty if the part has nothing to try */
  tryIt(k: number, host: HTMLElement): void
  /** the line under the scene for part `k` */
  caption(k: number): string
  /** stop timers and loops (the lesson is closing) */
  stop(): void
}

export type SceneMaker = (stage: HTMLElement, ctx: Ctx) => MoonScene

/** Theme colours a hash can be painted with, so the same hash always gets the same colour */
const CHIP_COLOURS = ['#6ff2c5', '#7cc4ff', '#ffcf5a', '#ff8ad8', '#ff9a3c', '#b69cff']
export const hashColor = (h: string) => CHIP_COLOURS[parseInt(h.slice(0, 2) || '0', 16) % CHIP_COLOURS.length]

/** A short hash as a coloured chip; `cls` adds ok / bad / dim */
export const chip = (h: string, n = 6, cls = '') => `<span class="gs-chip ${cls}" style="--c:${hashColor(h)}">${h ? h.slice(0, n) : '…'}</span>`

/** The part's index into a list of per-part things (later parts reuse the last one) */
export const at = <T,>(list: T[], k: number) => list[Math.max(0, Math.min(k, list.length - 1))]

/**
 * A "Try it" box: `html` holds the controls (give them data-a="name"), and a message line sits underneath.
 * Returns helpers to find a control and to set the message.
 */
export function tryBox(host: HTMLElement, html: string) {
  host.innerHTML = `<div class="gs-try">${html}<p class="fb" data-a="fb" aria-live="polite" hidden></p></div>`
  const q = <T extends HTMLElement = HTMLButtonElement>(a: string) => host.querySelector(`[data-a="${a}"]`) as T
  return {
    q,
    all: <T extends HTMLElement = HTMLButtonElement>(sel: string) => [...host.querySelectorAll<T>(sel)],
    msg(cls: '' | 'ok' | 'bad', text: string) {
      const f = q<HTMLElement>('fb')
      f.className = 'fb ' + cls
      f.textContent = text
      f.hidden = !text
    },
  }
}

/** Buttons for picking one value; the chosen one is marked .on */
export const pickHTML = (attr: string, values: (string | number)[], on: string | number, label: (v: string | number) => string = String) =>
  values.map((v) => `<button class="btn sm${v === on ? ' on' : ''}" data-${attr}="${v}">${label(v)}</button>`).join('')

/** Marks the button with `data-attr=value` as chosen */
export function markPick(host: HTMLElement, attr: string, value: string | number) {
  host.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(value)))
}

/**
 * Keeps a scene's async work honest: `alive()` turns false once the scene stops, and `wait` skips pauses when motion is off.
 * `run()` starts a new sequence and returns a check that turns false when a newer one starts.
 */
export function life(ctx: Ctx) {
  let on = true, seq = 0
  return {
    alive: () => on,
    stop() { on = false },
    run() { const n = ++seq; return () => on && n === seq },
    wait: (ms: number) => new Promise<void>((r) => setTimeout(r, ctx.motion ? ms : 0)),
  }
}

/** Replaces `el`'s HTML only when it changed, so running animations aren't restarted for nothing */
const painted = new WeakMap<HTMLElement, string>()
export function paint(el: HTMLElement, html: string) {
  if (painted.get(el) === html) return
  painted.set(el, html)
  el.innerHTML = html
}

/** 64 hash characters as tiles; `mask`ed ones (changed) glow gold */
export const tilesHTML = (h: string, mask?: boolean[], cls = '') =>
  `<div class="gs-tiles ${cls}">${[...(h || '·'.repeat(64))].map((c, i) => `<i${mask?.[i] ? ' class="d"' : ''}>${c}</i>`).join('')}</div>`

/** Which characters of `b` differ from `a`, and how many */
export function diff(a: string, b: string) {
  const mask = [...b].map((c, i) => c !== a[i])
  return { mask, count: mask.filter(Boolean).length }
}
