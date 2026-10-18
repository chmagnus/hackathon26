/**
 * Shared pieces for the Story Scroll lessons ported from the prototype (SharedLedgerStory, SignaturesStory,
 * HashStory, ProofOfWorkStory, LongestChainStory): the three friends, the ledger, the scenes, sha256 and the
 * inline quiz, and the part tracking with Back/Next that every lesson shares. Styles live in ../story.css.
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

/** A hash as HTML: the first `zeros` characters in mint (coral where they aren't 0 yet), `mask`ed ones in gold */
export function hashHTML(h: string, zeros = 0, mask?: boolean[]) {
  return [...h].map((c, i) => i < zeros ? `<span class="${c === '0' ? 'z' : 'x'}">${c}</span>` : mask?.[i] ? `<span class="d">${c}</span>` : c).join('')
}

/** Which characters of hash `b` differ from hash `a`, and how many */
export function hashDiff(a: string, b: string) {
  const mask = [...b].map((c, i) => c !== a[i])
  return { mask, count: mask.filter(Boolean).length }
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

/**
 * The fingerprint scene for the hash lessons (the prototype's bars around the moon): 64 bars, one per hash
 * character (taller = bigger hex digit), a label in the middle, the hash underneath, and a cover for anything else
 */
export function makeHashScene(host: HTMLElement) {
  host.innerHTML = `<div class="scene fp"><div class="ring">${Array.from({ length: 64 }, (_, i) => `<i style="--r:${i * 5.625}deg"></i>`).join('')}</div><div class="core"><b></b><span></span></div><div class="fph hx"></div><div class="cover" hidden></div></div>`
  const root = host.firstElementChild as HTMLElement
  const bars = [...root.querySelectorAll<HTMLElement>('.ring i')]
  const q = (s: string) => root.querySelector(s) as HTMLElement
  return {
    /** show `hash` on the bars: the first `zeros` are the target (mint = hit, coral = miss), `mask`ed bars turn gold */
    bars(hash: string, zeros = 0, mask?: boolean[]) {
      q('.cover').hidden = true
      bars.forEach((b, i) => {
        const c = hash[i] ?? '0'
        b.style.setProperty('--v', String(parseInt(c, 16)))
        b.className = i < zeros ? (c === '0' ? 'z' : 'x') : mask?.[i] ? 'd' : ''
      })
      q('.fph').innerHTML = hashHTML(hash, zeros, mask)
    },
    /** the label in the middle; `tone` colours the title */
    core(title: string, sub = '', tone: '' | 'ok' | 'bad' = '') {
      const c = q('.core')
      c.className = 'core ' + tone
      ;(c.firstElementChild as HTMLElement).textContent = title
      ;(c.lastElementChild as HTMLElement).textContent = sub
    },
    /** cover the bars with something else (blocks, a race…) */
    cover(html: string) { const c = q('.cover'); c.hidden = false; c.innerHTML = html },
  }
}

export type HashScene = ReturnType<typeof makeHashScene>

/* ---------- Blocks, mining races and chain lanes (ProofOfWorkStory, LongestChainStory and the generic scenes) ---------- */

export type Block = { data: string; nonce: number; prev: string; hash: string }
export const ZERO = '0'.repeat(64)
export const CHAIN_DATA = ['Alice pays Bob 20', 'Bob pays Charlie 5', 'Charlie pays Alice 8']
export const bstr = (b: Block) => b.prev + '|' + b.data + '|' + b.nonce
export const valid = (b: Block) => b.hash.startsWith('00')

/** Try nonces 0, 1, 2… until the block's hash starts with 00 */
export async function mine(b: Block) {
  b.nonce = 0
  while (!(b.hash = await sha256(bstr(b))).startsWith('00')) b.nonce++
}

/** Three blocks, each holding the hash of the one before (mined so every hash starts with 00, when `work`) */
export async function makeChain(work = true) {
  const c: Block[] = []
  for (const data of CHAIN_DATA) {
    const b = { data, nonce: 0, prev: c.length ? c[c.length - 1].hash : ZERO, hash: '' }
    if (work) await mine(b)
    else b.hash = await sha256(bstr(b))
    c.push(b)
  }
  return c
}

/** The blocks side by side; `status` gives each block's look (ok / bad / busy) and label. `work` shows nonces and the 00 target. */
export function chainHTML(chain: Block[], status: (b: Block, i: number) => [cls: string, label: string], work = true) {
  return `<div class="chain">${chain.map((b, i) => {
    const [s, label] = status(b, i)
    return `${i ? '<span class="arr">→</span>' : ''}<div class="blk ${s}"><div class="bt">Block ${i + 1}<span class="st">${label}</span></div><div class="bd">${esc(b.data) || '…'}</div><span class="lbl">Previous hash</span><span class="mono">${b.prev.slice(0, 10)}…</span><span class="lbl">${work ? `Hash · nonce ${b.nonce}` : 'Hash'}</span><span class="mono hx">${hashHTML(b.hash.slice(0, 10), work ? 2 : 0)}…</span></div>`
  }).join('')}</div>`
}

export type Miner = { n: string; c: string; rate: number }
/** The prototype's three miners; `rate` = guesses per frame (Gold has the fastest computer) */
export const MINERS: Miner[] = [{ n: 'Pink', c: '#ff8ad8', rate: 9 }, { n: 'Mint', c: '#6ff2c5', rate: 12 }, { n: 'Gold', c: '#ffcf5a', rate: 15 }]
export type RaceResult = { winner: number; hash: string; tries: number[] }

/** Every miner guesses nonces for their own block (with their reward line) until a hash starts with `zeros` zeros */
export async function raceMiners(miners: Miner[], zeros: number, alive: () => boolean, onTick: (tries: number[]) => void): Promise<RaceResult | null> {
  const tries = miners.map(() => 0), target = '0'.repeat(zeros)
  for (;;) {
    for (let i = 0; i < miners.length; i++) {
      for (let r = 0; r < miners[i].rate; r++) {
        const h = await sha256(`10 coins → ${miners[i].n} miner\nAlice pays Bob 20|${tries[i]}`)
        if (!alive()) return null
        tries[i]++
        if (h.startsWith(target)) return { winner: i, hash: h, tries }
      }
    }
    onTick(tries)
    await sleep(16)
  }
}

/** The race: one bar of guesses per miner, then the winning block with its reward line */
export function raceHTML(miners: Miner[], tries: number[] | null, win: RaceResult | null, zeros: number) {
  const full = 2 * 16 ** zeros // guesses for a full bar
  const w = win ? miners[win.winner] : null
  return `<div class="race">${miners.map((m, i) => {
    const t = tries?.[i] ?? 0
    return `<div class="rl${win?.winner === i ? ' win' : ''}" style="--c:${m.c}"><div class="av">${m.n[0]}</div><span class="bar"><i style="width:${Math.min(100, (t / full) * 100)}%"></i></span><span class="n">${t.toLocaleString()}</span></div>`
  }).join('')}</div>${w && win ? `<div class="blk ok"><div class="bt">New block<span class="st">Valid</span></div><div class="bd"><b style="color:${w.c}">10 new coins → ${w.n} miner</b><br>Alice pays Bob 20</div><span class="mono hx">${hashHTML(win.hash, zeros)}</span></div>` : '<p class="lnote">Each bar shows how many guesses that miner has made.</p>'}`
}

/** One row of blocks: `shared` grey blocks first, then `n` in `color`; block `pay` gets a gold ring */
export type Lane = { label: string; color: string; n: number; shared?: number; pay?: number; tag?: string; tone?: 'ok' | 'bad'; fresh?: boolean }
export function laneHTML(rows: Lane[]) {
  return `<div class="lanes">${rows.map((r) => {
    const total = (r.shared ?? 0) + r.n
    const cubes = Array.from({ length: total }, (_, i) => {
      const cls = [i < (r.shared ?? 0) ? 'sh' : '', i === r.pay ? 'pay' : '', r.fresh && i === total - 1 ? 'new' : ''].filter(Boolean).join(' ')
      return `<i class="cube ${cls}" style="--c:${r.color}"></i>`
    }).join('')
    return `<div class="lane"><div class="lh"><span style="color:${r.color}">${r.label}</span>${r.tag ? `<em class="tag ${r.tone ?? ''}">${r.tag}</em>` : ''}</div><div class="cubes">${cubes}</div></div>`
  }).join('')}</div>`
}

/** Chance a cheater with share `q` of the computing power ever catches up after `z` blocks: (q / (1 - q))^z */
export const catchUp = (z: number, q = 0.1) => Math.pow(q / (1 - q), z)
export const pct = (v: number) => (v >= 0.01 ? (v * 100).toFixed(1) : (v * 100).toFixed(4)) + '%'

/* ---------- Part tracking for every Story Scroll lesson ---------- */

/** Phones and small tablets: the scene sticks to the top and the story scrolls under it (story.css uses the same width) */
const PHONE = '(max-width: 1023px)'

/**
 * Watches the story's parts (`.sec[data-k]` inside the scrolling `main`) and calls `apply(k)` when part k reaches the
 * reading line: a band near the middle of the story, or on phones a band just under the sticky scene.
 * Also keeps `--prog` on `main` for the progress bar, and `go` scrolls to the part before or after (Back/Next).
 */
export function storyParts(main: HTMLElement, apply: (k: number) => void) {
  const phone = window.matchMedia(PHONE)
  const secs = () => [...main.querySelectorAll<HTMLElement>('.sec[data-k]')]
  let io: IntersectionObserver | undefined
  let active = -1
  let aim = -1 // the part Back/Next is scrolling to
  let aimT: ReturnType<typeof setTimeout> | undefined
  const show = (k: number) => {
    if (k === active) return
    active = k
    main.style.setProperty('--prog', String((k + 1) / secs().length))
    apply(k)
  }
  const watch = () => {
    io?.disconnect()
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return
      const k = +(e.target as HTMLElement).dataset.k!
      // while Back/Next scrolls, parts passed on the way don't count
      if (aim >= 0 && k !== aim) return
      aim = -1
      show(k)
    }), { root: main, rootMargin: phone.matches ? '-60% 0px -30% 0px' : '-35% 0px -55% 0px' })
    secs().forEach((s) => io!.observe(s))
  }
  watch()
  phone.addEventListener('change', watch)
  return {
    /** scroll to the previous (-1) or next (1) part, counting from the one it's already heading to (quick double clicks still move on) */
    go(step: number) {
      const all = secs()
      const k = Math.min(all.length - 1, Math.max(0, (aim >= 0 ? aim : Math.max(active, 0)) + step))
      if (!all[k]) return
      aim = k
      // the reading line takes over again once the scroll has finished (or after a few seconds, in case it never says so)
      clearTimeout(aimT)
      aimT = setTimeout(() => (aim = -1), 4000)
      main.addEventListener('scrollend', () => { clearTimeout(aimT); aim = -1 }, { once: true })
      show(k) // the scene and "Part k of n" change straight away
      // on phones the scene sits over the top of the story, so stop just under it
      const stage = main.querySelector<HTMLElement>('.i1-stage')
      const cover = phone.matches && stage ? stage.offsetHeight + 8 : 0
      main.scrollTo({ top: main.scrollTop + all[k].getBoundingClientRect().top - main.getBoundingClientRect().top - cover })
    },
    stop() { io?.disconnect(); clearTimeout(aimT); phone.removeEventListener('change', watch) },
  }
}

/** Back / "Part k of n" / Next under the scene, the same in every lesson */
export const navHTML = '<div class="snav"><button class="btn sm" id="sback">← Back</button><span id="spart"></span><button class="btn sm" id="snext">Next →</button></div>'

export type QuizOption = [text: string, right: boolean, feedback: string]

/** The inline quiz used inside the story: each answer shows its feedback under the options */
export function quiz(host: HTMLElement, q: string, opts: QuizOption[], onRight?: () => void) {
  host.innerHTML = `<div class="qz"><div class="qq">${q}</div>${opts.map((o, i) => `<button class="opt" data-i="${i}">${o[0]}</button>`).join('')}<p class="fb" hidden></p></div>`
  const fb = host.querySelector('.fb') as HTMLElement
  host.querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => (b.onclick = () => {
    const o = opts[+b.dataset.i!]
    host.querySelectorAll('.opt').forEach((x) => x.classList.remove('right', 'wrong'))
    b.classList.add(o[1] ? 'right' : 'wrong')
    fb.hidden = false; fb.className = 'fb ' + (o[1] ? 'ok' : 'bad'); fb.textContent = o[2]
    if (o[1]) onRight?.()
  }))
}
