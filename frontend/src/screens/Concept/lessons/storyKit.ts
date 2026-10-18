/**
 * Shared pieces for the Story Scroll lessons ported from the prototype (SharedLedgerStory, SignaturesStory):
 * the three friends, the ledger, the scene and the inline quiz. Styles live in ../story.css.
 */

export type Name = 'Alice' | 'Bob' | 'Charlie'
/** One ledger line. `sys` = starting money, `bad` = a cheat (shown in red), `sig` = a signature shown under it */
export type Line = { f?: Name; t: Name; a: number; sys?: 1; bad?: 1; note?: string; sig?: string }

export const NAMES: Name[] = ['Alice', 'Bob', 'Charlie']
export const PCOL: Record<Name, string> = { Alice: '#ff8a7a', Bob: '#7cc4ff', Charlie: '#ffcf5a' }

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** SHA-256 of `text` as 64 hex characters (the browser's Web Crypto) */
export async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function balances(lines: Line[], start = 0) {
  const b: Record<Name, number> = { Alice: start, Bob: start, Charlie: start }
  lines.forEach((l) => {
    if (l.bad) return
    if (l.sys) { b[l.t] += l.a; return }
    b[l.f!] -= l.a
    b[l.t] += l.a
  })
  return b
}

export function ledgerHTML(lines: Line[], newIdx: number | null) {
  return `<ul class="ledger">${lines.map((l, i) => l.sys
    ? `<li class="sys${i === newIdx ? ' new' : ''}"><span><span class="who">${l.t}</span> starts with</span><span class="amt">${l.a}</span></li>`
    : `<li class="${l.bad ? 'bad' : ''}${i === newIdx ? ' new' : ''}"><span><span class="who" style="color:${PCOL[l.f!]}">${l.f}</span> pays <span class="who" style="color:${PCOL[l.t]}">${l.t}</span>${l.note ? `<br><span class="note">${esc(l.note)}</span>` : ''}${l.sig ? `<br><span class="sig">${esc(l.sig)}</span>` : ''}</span><span class="amt">${l.a}</span></li>`,
  ).join('')}</ul>`
}

export const selP = (id: string, v: Name) => `<select id="${id}" aria-label="Person">${NAMES.map((n) => `<option${n === v ? ' selected' : ''}>${n}</option>`).join('')}</select>`
const avHTML = (n: Name) => `<div class="av" style="--c:${PCOL[n]}">${n[0]}</div>`

/**
 * The scene: three friends, a paper card (the ledger or anything else), balances, the pot, flying coins,
 * and each friend's two keys (same as the prototype's makeScene, plus the keys from its 3D scene)
 */
export function makeScene(host: HTMLElement) {
  host.innerHTML = `<div class="scene"><div class="pot" hidden>Pot <b>0</b></div>${NAMES.map((n) => `<div class="pp" data-n="${n}">${avHTML(n)}<span class="pn" style="color:${PCOL[n]}">${n}</span><em class="bal" hidden></em><span class="keys" hidden><i class="key s">secret key</i><i class="key p">public key</i></span><i class="say" hidden></i></div>`).join('')}<div class="book" hidden></div></div>`
  const root = host.firstElementChild as HTMLElement
  const P: Record<string, [number, number]> = { Alice: [15, 76], Bob: [85, 76], Charlie: [50, 17], book: [50, 56], pot: [50, 92] }
  const el = (n: Name) => root.querySelector(`[data-n="${n}"]`) as HTMLElement
  const book = root.querySelector('.book') as HTMLElement
  NAMES.forEach((n) => { el(n).style.left = P[n][0] + '%'; el(n).style.top = P[n][1] + '%' })
  const sayT: Partial<Record<Name, ReturnType<typeof setTimeout>>> = {}
  const paper = (title: string, html: string) => {
    book.hidden = false
    book.innerHTML = `<div class="bh">${title}</div>${html}`
  }
  return {
    paper,
    lines(lines: Line[], ni?: number | null) {
      const shown = lines.slice(-7)
      paper('Shared ledger', ledgerHTML(shown, ni == null ? null : ni - Math.max(0, lines.length - 7)))
      const u = book.querySelector('ul'); if (u) u.scrollTop = 1e9
    },
    hideBook() { book.hidden = true },
    coin(a: string, b: string, red?: boolean) {
      const c = document.createElement('div')
      c.className = 'coin' + (red ? ' red' : '')
      c.style.left = P[a][0] + '%'; c.style.top = P[a][1] + '%'
      root.appendChild(c)
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.left = P[b][0] + '%'; c.style.top = P[b][1] + '%' }))
      setTimeout(() => { c.style.opacity = '0'; setTimeout(() => c.remove(), 300) }, 900)
    },
    bal(map: Record<Name, number> | null, net?: boolean) {
      NAMES.forEach((n) => {
        const e = el(n).querySelector('.bal') as HTMLElement
        if (!map) { e.hidden = true; return }
        e.hidden = false
        const v = map[n]
        e.textContent = (net && v > 0 ? '+' : '') + v
        e.style.color = net ? (v > 0 ? 'var(--mint)' : v < 0 ? 'var(--coral)' : 'var(--ink)') : v < 0 ? 'var(--coral)' : 'var(--ink)'
      })
    },
    say(n: Name, t: string, ms?: number) {
      const e = el(n).querySelector('.say') as HTMLElement
      e.textContent = t; e.hidden = false
      clearTimeout(sayT[n]); sayT[n] = setTimeout(() => (e.hidden = true), ms || 2600)
    },
    hush() { NAMES.forEach((n) => ((el(n).querySelector('.say') as HTMLElement).hidden = true)) },
    shake(n: Name) { const e = el(n); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake') },
    hl(n: Name | null) { NAMES.forEach((x) => el(x).classList.toggle('hl', x === n)) },
    pot(v: number | null) {
      const p = root.querySelector('.pot') as HTMLElement
      if (v == null) { p.hidden = true; return }
      p.hidden = false; (p.querySelector('b') as HTMLElement).textContent = String(v)
    },
    /** show or hide everyone's secret (gold) and public (blue) keys */
    keys(on: boolean) {
      NAMES.forEach((n) => ((el(n).querySelector('.keys') as HTMLElement).hidden = !on))
      root.classList.toggle('keyed', on) // the paper card moves down a little to clear Charlie's keys
    },
    /** make one key light up for a moment: 's' = secret, 'p' = public */
    glowKey(n: Name, which: 's' | 'p') {
      const k = el(n).querySelector(`.key.${which}`) as HTMLElement
      k.classList.remove('glow'); void k.offsetWidth; k.classList.add('glow')
    },
  }
}

export type Scene = ReturnType<typeof makeScene>
export type QuizOption = [text: string, right: boolean, feedback: string]

/** Returns the inline quiz used inside the story; Algo comments on each answer through `say` */
export function makeQuiz(say: (text: string) => void) {
  return function quiz(host: HTMLElement, q: string, opts: QuizOption[], onRight?: () => void) {
    host.innerHTML = `<div class="qz"><div class="qq">${q}</div>${opts.map((o, i) => `<button class="opt" data-i="${i}">${o[0]}</button>`).join('')}<p class="fb" hidden></p></div>`
    const fb = host.querySelector('.fb') as HTMLElement
    host.querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => (b.onclick = () => {
      const o = opts[+b.dataset.i!]
      host.querySelectorAll('.opt').forEach((x) => x.classList.remove('right', 'wrong'))
      b.classList.add(o[1] ? 'right' : 'wrong')
      fb.hidden = false; fb.className = 'fb ' + (o[1] ? 'ok' : 'bad'); fb.textContent = o[2]
      if (o[1]) { say(o[2]); onRight?.() } else say('Not quite. ' + o[2])
    }))
  }
}
