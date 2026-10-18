/**
 * Shared pieces for the Story Scroll lessons ported from the prototype (SharedLedgerStory, SignaturesStory,
 * HashStory, ProofOfWorkStory, LongestChainStory): the three friends, the ledger, the scenes, sha256 and the
 * inline quiz. At the bottom: the same scenes as ready-made widgets for GenericLesson (mountScene).
 * Styles live in ../story.css.
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

/* ---------- Scenes for GenericLesson: the pieces above, with their controls in a bar under the picture ---------- */

export type SceneName = 'hash' | 'chain' | 'mining' | 'lanes' | 'merkle' | 'stake'
/** What a scene does during one part of the story. `{}` = the scene's main view, fully interactive. */
export type ScenePart = {
  /** false: just show the idea (the controls unlock in a later part) */
  try?: boolean
  /** which view: hash 'bits' · mining 'search' | 'race' | 'chain' · lanes 'copies' | 'fork' | 'attack' | 'confirm' · merkle 'proof' | 'swap' · stake 'vote' | 'slash' */
  mode?: 'bits' | 'search' | 'race' | 'chain' | 'copies' | 'fork' | 'attack' | 'confirm' | 'proof' | 'swap' | 'vote' | 'slash'
  /** chain: blocks need a hash starting with 00, and broken ones can be re-mined */
  work?: boolean
  /** chain (without work): offer to overwrite the saved fingerprints */
  rewrite?: boolean
  /** mining: let the learner pick the difficulty (how many zeros) */
  zeros?: boolean
  /** mining race: let the learner pick how many miners race */
  crowd?: boolean
  /** lanes copies: offer a block that breaks the rules */
  bad?: boolean
  /** lanes copies: Charlie hears about new blocks late */
  lag?: boolean
}

type View = { set(p: ScenePart): void; stop(): void }
type ViewMaker = (vis: HTMLElement, bar: HTMLElement) => View

const MINT = 'var(--mint)', SKY = 'var(--sky)', ORANGE = '#ff9a3c'
const byA = <T extends HTMLElement = HTMLElement>(root: HTMLElement, a: string) => root.querySelector(`[data-a="${a}"]`) as T
const hint = (t: string) => `<span class="hint">${t}</span>`
const choices = (label: string, attr: string, values: number[], on: number, text: (v: number) => string) =>
  `<span class="down">${label}</span>${values.map((v) => `<button class="btn sm${v === on ? ' on' : ''}" data-${attr}="${v}">${text(v)}</button>`).join('')}`

/** The message line under a scene's controls; it survives the controls being redrawn */
function noteLine(bar: HTMLElement) {
  let cls = '', text = ''
  return {
    html: () => `<p class="fb ${cls}" data-a="fb"${text ? '' : ' hidden'}>${esc(text)}</p>`,
    set(c: string, t: string) {
      cls = c; text = t
      const f = bar.querySelector<HTMLElement>('[data-a="fb"]')
      if (f) { f.className = 'fb ' + c; f.textContent = t; f.hidden = !t }
    },
  }
}

/** How many of the 256 bits differ between two hashes */
function bitDiff(a: string, b: string) {
  let n = 0
  for (let i = 0; i < a.length; i++) for (let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); x; x >>= 1) n += x & 1
  return n
}

/** Hash ring: the learner's copy against a fixed original; gold bars changed (the avalanche effect) */
const avalancheView: ViewMaker = (vis, bar) => {
  const ORIGINAL = 'Alice pays Bob 3'
  const sc = makeHashScene(vis)
  const note = noteLine(bar)
  let on = true, part: ScenePart = {}, text = 'Alice pays Bob 4', base = '', hash = ''
  const draw = () => {
    if (!base || !hash) return
    const { mask, count } = hashDiff(base, hash), bits = bitDiff(base, hash)
    sc.bars(hash, 0, mask)
    if (!count) sc.core('Identical', 'same text, same hash', 'ok')
    else if (part.mode === 'bits') sc.core(`${bits} of 256`, 'bits flipped')
    else sc.core(`${count} of 64`, 'characters changed')
    note.set('', count ? `${count} of 64 characters and ${bits} of 256 bits changed.` : 'Same text as the original, so the same hash.')
  }
  const hashText = async (v: string) => {
    text = v
    const h = await sha256(v)
    if (!on || text !== v) return
    hash = h; draw()
  }
  sha256(ORIGINAL).then((h) => { base = h; hashText(text) })
  return {
    set(p) {
      part = p
      const can = p.try !== false
      bar.innerHTML = hint(can ? 'Change the copy, even by one letter. Gold bars changed from the original.' : 'Only one digit differs. The gold bars show how much of the hash changed.')
        + `<span class="down">Original: <b>${ORIGINAL}</b></span>`
        + (can ? `<input type="text" class="txt" data-a="in" aria-label="Your copy" value="${esc(text)}">` : `<span class="down">Copy: <b>${esc(text)}</b></span>`)
        + note.html()
      if (can) byA<HTMLInputElement>(bar, 'in').oninput = (e) => hashText((e.target as HTMLInputElement).value)
      draw()
    },
    stop() { on = false },
  }
}

/** Chain of three blocks: edit one and it and the later ones break. With `work`, re-mine them; without, they're checked against saved fingerprints. */
const chainView: ViewMaker = (vis, bar) => {
  vis.innerHTML = '<div class="scene cv"></div>'
  const box = vis.firstElementChild as HTMLElement
  const note = noteLine(bar)
  let on = true, part: ScenePart = {}, work: boolean | null = null
  let chain: Block[] = [], saved: string[] = [], mining = -1, pick = 0, run = 0
  const status = (b: Block, i: number): [string, string] =>
    mining === i ? ['busy', 'Mining…'] : work ? (valid(b) ? ['ok', 'Valid'] : ['bad', 'Broken']) : b.hash === saved[i] ? ['ok', '✓ Matches'] : ['bad', '✗ Changed']
  const draw = () => {
    box.innerHTML = chain.length
      ? chainHTML(chain, status, !!work) + `<p class="lnote">${work ? 'Valid = its hash starts with 00.' : 'Each block is checked against the fingerprint saved when it was written.'}</p>`
      : '<p class="lnote">Building the chain…</p>'
    bar.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) => (b.disabled = mining >= 0 || valid(chain[+b.dataset.m!])))
    bar.querySelectorAll<HTMLInputElement>('[data-a="in"],[data-a="pick"],[data-a="reset"]').forEach((el) => (el.disabled = mining >= 0))
  }
  // each block's previous hash and own hash, worked out again from the start
  const recompute = async () => {
    const r = ++run
    for (let i = 0; i < chain.length; i++) {
      const b = chain[i]
      b.prev = i ? chain[i - 1].hash : ZERO
      const h = await sha256(bstr(b))
      if (!on || r !== run) return false
      b.hash = h
    }
    return true
  }
  const build = async () => {
    const w = !!work
    run++; chain = []; mining = -1; note.set('', ''); controls()
    const c = await makeChain(w)
    if (!on || work !== w) return
    chain = c; saved = c.map((b) => b.hash); pick = 0
    controls()
  }
  const remine = async (i: number) => {
    const c = chain, b = c[i]
    mining = i; b.prev = i ? c[i - 1].hash : ZERO; b.nonce = 0; draw()
    for (;;) {
      b.hash = await sha256(bstr(b))
      if (!on || chain !== c) return
      if (valid(b)) break
      b.nonce++
      if (b.nonce % 4 === 0) { draw(); await sleep(16) }
    }
    mining = -1
    if (!(await recompute())) return
    draw()
    const next = chain.findIndex((x) => !valid(x))
    note.set(next < 0 ? 'ok' : '', next < 0 ? `Block ${i + 1} re-mined with nonce ${b.nonce}. The whole chain is valid again!` : `Block ${i + 1} re-mined with nonce ${b.nonce}. Now block ${next + 1} is broken instead.`)
  }
  const controls = () => {
    const can = part.try !== false && chain.length > 0
    bar.innerHTML = hint(part.try === false ? 'Each block holds the hash of the block before it.' : work ? 'Edit a block: it and every block after it break. Then re-mine them one by one.' : 'Edit a block and watch it, and every block after it, stop matching.')
      + (can ? `<select data-a="pick" aria-label="Block to edit">${chain.map((_, i) => `<option value="${i}"${i === pick ? ' selected' : ''}>Block ${i + 1}</option>`).join('')}</select><input type="text" class="txt" data-a="in" aria-label="Block data" value="${esc(chain[pick].data)}">`
        + (work ? chain.map((_, i) => `<button class="btn sm gold" data-m="${i}">Re-mine ${i + 1}</button>`).join('') : '')
        + (part.rewrite && !work ? '<button class="btn sm danger" data-a="rw">Overwrite the saved fingerprints</button>' : '')
        + '<button class="btn sm" data-a="reset">Reset</button>' + note.html() : '')
    if (can) {
      byA<HTMLSelectElement>(bar, 'pick').onchange = (e) => { pick = +(e.target as HTMLSelectElement).value; byA<HTMLInputElement>(bar, 'in').value = chain[pick].data }
      byA<HTMLInputElement>(bar, 'in').oninput = async (e) => {
        if (mining >= 0) return
        chain[pick].data = (e.target as HTMLInputElement).value
        if (!(await recompute())) return
        draw()
        const first = chain.findIndex((b, i) => (work ? !valid(b) : b.hash !== saved[i]))
        note.set(first < 0 ? 'ok' : 'bad', first < 0 ? 'Every block checks out.' : `Block ${first + 1} and every block after it ${work ? 'broke' : 'no longer match'}.`)
      }
      bar.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) => (b.onclick = () => { if (mining < 0) remine(+b.dataset.m!) }))
      const rw = bar.querySelector<HTMLElement>('[data-a="rw"]')
      if (rw) rw.onclick = () => { saved = chain.map((b) => b.hash); draw(); note.set('bad', 'Everything matches again. Without another trusted copy of the old fingerprints, nobody can tell the history changed.') }
      byA(bar, 'reset').onclick = () => build()
    }
    draw()
  }
  return {
    set(p) {
      part = p
      if (!!p.work !== work) { work = !!p.work; build() } else controls()
    },
    stop() { on = false },
  }
}

/** Nonce search on the hash ring: try nonces until the block's hash starts with enough zeros */
const searchView: ViewMaker = (vis, bar) => {
  const TX = CHAIN_DATA.join('\n')
  const SPEED = [1, 2, 24, 300] // guesses per frame for 1–4 zeros, so even 0000 turns up in seconds
  const sc = makeHashScene(vis)
  const note = noteLine(bar)
  let on = true, zeros = 2, nonce = 0, shown = 0, h = '', found: number | null = null, run = 0
  const draw = () => {
    if (!h) return
    sc.bars(h, zeros)
    sc.core(found !== null ? '✓ Found it!' : `Nonce ${shown.toLocaleString()}`, found !== null ? `nonce ${found.toLocaleString()} works` : `needs ${'0'.repeat(zeros)} at the start`, found !== null ? 'ok' : '')
  }
  const reset = async () => {
    run++; nonce = 0; shown = 0; found = null; note.set('', '')
    const x = await sha256(TX + '|0')
    if (!on || nonce !== 0) return
    h = x; draw()
  }
  // one guess: hash the block with the next nonce
  const step = async () => {
    const n = nonce
    const x = await sha256(TX + '|' + n)
    if (!on || found !== null || n !== nonce) return
    h = x; shown = n
    if (x.startsWith('0'.repeat(zeros))) found = n
    else nonce++
  }
  const report = () => {
    draw()
    note.set(found !== null ? 'ok' : '', found !== null
      ? `Nonce ${found.toLocaleString()} works after ${(found + 1).toLocaleString()} guesses. Expected: about 1 in ${(16 ** zeros).toLocaleString()}.`
      : `Nonce ${shown.toLocaleString()} misses. Keep going!`)
  }
  reset()
  return {
    set(p) {
      const can = p.try !== false
      bar.innerHTML = hint(can ? 'Try nonces one by one, or let the computer search.' : 'The same block always gives the same hash. A new nonce gives a fresh try.')
        + `<span class="down">Block: ${CHAIN_DATA[0]}, … + nonce</span>`
        + (can ? '<button class="btn sm" data-a="next">Try next nonce</button><button class="btn sm gold" data-a="auto">Mine automatically</button><button class="btn sm" data-a="reset">Reset</button>'
          + (p.zeros ? choices('Target', 'z', [1, 2, 3, 4], zeros, (z) => '0'.repeat(z)) : '') + note.html() : '')
      if (can) {
        byA(bar, 'next').onclick = async () => {
          run++
          if (found !== null) return
          await step()
          if (on) report()
        }
        byA(bar, 'auto').onclick = async () => {
          if (found !== null) return
          const r = ++run
          while (on && r === run && found === null) {
            for (let i = 0; i < SPEED[zeros - 1] && found === null && r === run; i++) await step()
            if (on && r === run) report()
            await sleep(16)
          }
        }
        byA(bar, 'reset').onclick = () => reset()
        bar.querySelectorAll<HTMLButtonElement>('[data-z]').forEach((b) => (b.onclick = () => {
          zeros = +b.dataset.z!
          bar.querySelectorAll('[data-z]').forEach((x) => x.classList.toggle('on', x === b))
          reset()
        }))
      }
      draw()
    },
    stop() { on = false },
  }
}

/** Mining race: miners guess at the same time; the first valid hash wins the block reward */
const raceView: ViewMaker = (vis, bar) => {
  vis.innerHTML = '<div class="scene cv"></div>'
  const box = vis.firstElementChild as HTMLElement
  const note = noteLine(bar)
  let on = true, part: ScenePart = {}, zeros = 3, count = 3, tries: number[] | null = null, win: RaceResult | null = null, run = 0, running = false
  const miners = () => MINERS.slice(0, count)
  const draw = () => { box.innerHTML = raceHTML(miners(), tries, win, zeros) }
  const stopRace = () => { run++; running = false; tries = null; win = null; note.set('', '') }
  const race = async () => {
    const r = ++run, t0 = performance.now()
    running = true; tries = null; win = null; note.set('', ''); controls()
    const res = await raceMiners(miners(), zeros, () => on && r === run, (t) => { tries = t; draw() })
    if (!res) return
    running = false; win = res; tries = res.tries
    const total = res.tries.reduce((a, b) => a + b, 0)
    note.set('ok', `${miners()[res.winner].n} miner wins after ${total.toLocaleString()} guesses in all (${((performance.now() - t0) / 1000).toFixed(1)}s) and earns 10 new coins.`)
    controls()
  }
  const controls = () => {
    const can = part.try !== false
    bar.innerHTML = hint(part.crowd ? 'More miners make more guesses each second, so a block turns up sooner.' : 'Miners race to find a valid nonce. The winner adds a line paying themselves new coins.')
      + (can ? `<button class="btn sm gold" data-a="go"${running ? ' disabled' : ''}>${win ? 'Race again' : 'Start the race'}</button>`
        + (part.zeros ? choices('Target', 'z', [2, 3], zeros, (z) => '0'.repeat(z)) : '')
        + (part.crowd ? choices('Miners', 'c', [1, 2, 3], count, String) : '')
        + note.html() : '')
    if (can) {
      byA(bar, 'go').onclick = () => race()
      bar.querySelectorAll<HTMLButtonElement>('[data-z]').forEach((b) => (b.onclick = () => { zeros = +b.dataset.z!; stopRace(); controls() }))
      bar.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) => (b.onclick = () => { count = +b.dataset.c!; stopRace(); controls() }))
    }
    draw()
  }
  return {
    set(p) { part = p; controls() },
    stop() { on = false },
  }
}

/** Chain lanes: everyone's copies, a fork, Alice's secret chain, and blocks piling up on a payment */
const lanesView: ViewMaker = (vis, bar) => {
  vis.innerHTML = '<div class="scene ls"></div>'
  const box = vis.firstElementChild as HTMLElement
  const note = noteLine(bar)
  const st = { copies: [4, 4, 4], rejected: false, a: 2, b: 2, q: 30, honest: 1, fake: 1, running: false, wait: 0, cq: 10 }
  let on = true, part: ScenePart = {}, pop: number[] = [] // lanes whose newest block pops in
  const mode = () => part.mode ?? 'copies'
  const draw = () => {
    const m = mode()
    if (m === 'copies') {
      const top = Math.max(...st.copies)
      box.innerHTML = laneHTML(NAMES.map((n, i): Lane => {
        const behind = st.copies[i] < top
        return { label: `${n}'s node`, color: PCOL[n], n: st.copies[i], fresh: pop.includes(i), tag: st.rejected ? '✗ Rejected' : behind ? "Hasn't heard yet…" : '✓ Up to date', tone: st.rejected ? 'bad' : behind ? undefined : 'ok' }
      })) + `<p class="lnote">${st.rejected ? 'Every node checked the rules and threw the bad block out.' : 'Each node keeps its own copy and checks every new block.'}</p>`
    }
    if (m === 'fork') {
      const { a, b } = st
      box.innerHTML = laneHTML([
        { label: 'Chain A', color: MINT, shared: 2, n: a, tag: a > b ? '✓ Everyone follows this' : a === b ? 'Tie…' : '', tone: a > b ? 'ok' : undefined, fresh: pop.includes(0) },
        { label: 'Chain B', color: SKY, shared: 2, n: b, tag: b > a ? '✓ Everyone follows this' : a === b ? 'Tie…' : '', tone: b > a ? 'ok' : undefined, fresh: pop.includes(1) },
      ]) + '<p class="lnote">Grey blocks came before the split.</p>'
    }
    if (m === 'attack') {
      const fooled = st.fake > st.honest
      box.innerHTML = laneHTML([
        { label: 'Public chain', color: MINT, n: st.honest, pay: 0, tag: fooled ? '' : '✓ Everyone follows this', tone: 'ok' },
        { label: "Alice's secret chain", color: ORANGE, n: st.fake, pay: 0, tag: fooled ? '✗ Everyone follows this' : '', tone: 'bad' },
      ]) + `<p class="lnote">Gold rings: the same coins, paid to Bob in public and back to Alice in secret. Alice has ${st.q}% of the computing power.</p>`
    }
    if (m === 'confirm') {
      box.innerHTML = laneHTML([{ label: 'Your payment + blocks on top', color: MINT, n: st.wait + 1, pay: 0, tag: `${st.wait} on top`, tone: 'ok', fresh: pop.includes(0) }])
        + `<p class="lnote">Chance a ${st.cq}% cheater catches up</p><p class="lnote"><span class="bign">${pct(catchUp(st.wait, st.cq / 100))}</span></p>`
    }
    pop = []
  }
  const grow = (lanes: number[]) => { pop = lanes; draw() }
  const attack = async () => {
    if (st.running) return
    st.running = true; st.honest = 1; st.fake = 1; note.set('', ''); controls()
    let msg = '', cls = 'ok'
    while (!msg) {
      await sleep(550)
      if (!on) return
      if (Math.random() < st.q / 100) st.fake++
      else st.honest++
      if (st.honest - st.fake >= 3) msg = 'The public chain got 3 blocks ahead. Alice gives up, and Bob keeps his payment.'
      else if (st.fake >= 11 || st.honest >= 11) {
        if (st.fake > st.honest) { msg = "Alice's secret chain is longer! Everyone switches to it, and Bob's payment disappears."; cls = 'bad' }
        else msg = 'The public chain stayed ahead. Bob keeps his payment.'
      }
      if (mode() === 'attack') draw()
    }
    st.running = false
    if (mode() === 'attack') { note.set(cls, msg); controls() }
  }
  const controls = () => {
    const m = mode(), can = part.try !== false
    let html = ''
    if (m === 'copies') {
      html = hint(!can ? 'Every node keeps its own copy of the chain.' : part.lag ? 'Charlie is far away, so news reaches Charlie a little late.' : part.bad ? 'Nodes check every block. Try sneaking in one that breaks the rules.' : 'A miner broadcasts a block, and every node adds it to its copy.')
        + (can ? '<button class="btn sm gold" data-a="add">Broadcast a block</button>' + (part.bad ? '<button class="btn sm danger" data-a="bad">Broadcast a rule-breaking block</button>' : '') : '')
    }
    if (m === 'fork') html = hint('Two blocks were found at once. Add blocks to either side; everyone follows the side with more work.')
      + (can ? '<button class="btn sm" data-a="fa">+ block on A</button><button class="btn sm" data-a="fb2">+ block on B</button><button class="btn sm" data-a="reset">Reset</button>' : '')
    if (m === 'attack') html = hint(can ? "Pick Alice's share of the computing power, then run the race." : 'Alice pays Bob in public, but secretly mines a chain where the same coins go back to her.')
      + (can ? `<span class="down">Alice: <b data-a="qv">${st.q}%</b></span><input type="range" data-a="q" min="5" max="60" value="${st.q}" aria-label="Alice's share of computing power"${st.running ? ' disabled' : ''}><button class="btn sm gold" data-a="run"${st.running ? ' disabled' : ''}>Run</button>` : '')
    if (m === 'confirm') html = hint("Add blocks on top of the payment. Each one makes a cheater's catch-up less likely.")
      + (can ? `<button class="btn sm gold" data-a="add">Add a block on top</button><button class="btn sm" data-a="reset">Start over</button><span class="down">Cheater: <b data-a="qv">${st.cq}%</b></span><input type="range" data-a="q" min="5" max="45" value="${st.cq}" aria-label="Cheater's share of computing power">` : '')
    bar.innerHTML = html + (can ? note.html() : '')
    if (can) bind(m)
    draw()
  }
  const bind = (m: string) => {
    const el = (a: string) => bar.querySelector<HTMLElement>(`[data-a="${a}"]`)
    if (m === 'copies') {
      el('add')!.onclick = () => {
        if (Math.max(...st.copies) >= 10) { note.set('', 'The copies are full for now.'); return }
        if (part.lag) {
          st.copies[0]++; st.copies[1]++; grow([0, 1])
          note.set('', "For a moment the nodes disagree. Nobody is cheating: messages just take time.")
          setTimeout(() => { if (!on) return; st.copies[2]++; if (mode() === 'copies') grow([2]) }, 1400)
        } else {
          st.copies = st.copies.map((c) => c + 1); grow([0, 1, 2])
          note.set('ok', 'Every node checked the block and added it. All the copies still match.')
        }
      }
      const bad = el('bad')
      if (bad) bad.onclick = () => {
        st.rejected = true; draw()
        note.set('bad', 'Rejected! It spends coins without a valid signature, so no node adds it, however much work went into it.')
        setTimeout(() => { if (!on) return; st.rejected = false; if (mode() === 'copies') draw() }, 1800)
      }
    }
    if (m === 'fork') {
      const said = () => note.set(st.a === st.b ? '' : 'ok', st.a === st.b ? "It's a tie. Wait for the next block." : `Everyone follows Chain ${st.a > st.b ? 'A' : 'B'}: it has the most work.`)
      el('fa')!.onclick = () => { if (st.a < 9) { st.a++; grow([0]); said() } }
      el('fb2')!.onclick = () => { if (st.b < 9) { st.b++; grow([1]); said() } }
      el('reset')!.onclick = () => { st.a = 2; st.b = 2; draw(); said() }
    }
    if (m === 'attack' || m === 'confirm') {
      el('q')!.oninput = (e) => {
        const v = +(e.target as HTMLInputElement).value
        if (m === 'attack') st.q = v; else st.cq = v
        el('qv')!.textContent = v + '%'
        draw()
      }
    }
    if (m === 'attack') el('run')!.onclick = () => attack()
    if (m === 'confirm') {
      el('add')!.onclick = () => {
        if (st.wait >= 6) return
        st.wait++; grow([0])
        if (st.wait === 6) note.set('ok', 'Six blocks deep. Many Bitcoin users treat that as final.')
      }
      el('reset')!.onclick = () => { st.wait = 0; note.set('', ''); draw() }
    }
  }
  return {
    set(p) { part = p; controls() },
    stop() { on = false },
  }
}

/** Merkle tree: four transactions hashed in pairs up to one root; an edit turns its path to the root red */
const merkleView: ViewMaker = (vis, bar) => {
  const TXS = ['Alice pays Bob 3', 'Bob pays Charlie 1', 'Charlie pays Dan 2', 'Dan pays Alice 4']
  const LEAVES = ['A', 'B', 'C', 'D']
  // [key, label, x %, y %, parent]
  const NODES: [string, string, number, number, string][] = [
    ['root', 'Root', 50, 12, ''], ['P', 'P = H(A+B)', 25, 36, 'root'], ['Q', 'Q = H(C+D)', 75, 36, 'root'],
    ...LEAVES.map((k, i): [string, string, number, number, string] => [k, `H(${k})`, 12.5 + i * 25, 60, i < 2 ? 'P' : 'Q']),
  ]
  const at = (k: string) => NODES.find((n) => n[0] === k)!
  vis.innerHTML = `<div class="scene mk"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${NODES.filter((n) => n[4]).map(([k, , x, y, p]) => `<line data-l="${k}" x1="${x}" y1="${y}" x2="${at(p)[2]}" y2="${at(p)[3]}"/>`).join('')}${LEAVES.map((k, i) => `<line data-l="${k}" x1="${12.5 + i * 25}" y1="84" x2="${12.5 + i * 25}" y2="60"/>`).join('')}</svg>`
    + NODES.map(([k, label, x, y]) => `<div class="nd" data-n="${k}" style="left:${x}%;top:${y}%"><b>${label}</b><span class="mono">…</span></div>`).join('')
    + TXS.map((t, i) => `<input type="text" class="leaf" data-t="${i}" aria-label="Transaction ${LEAVES[i]}" value="${esc(t)}" style="left:${12.5 + i * 25}%">`).join('') + '</div>'
  const root = vis.firstElementChild as HTMLElement
  const inputs = [...root.querySelectorAll<HTMLInputElement>('.leaf')]
  const note = noteLine(bar)
  let on = true, part: ScenePart = {}, txs = [...TXS], orig: Record<string, string> | null = null, cur: Record<string, string> = {}, run = 0
  const PATH = ['B', 'P', 'root'], SIBLINGS = ['A', 'Q'] // the proof that B is in the tree
  const look = (k: string) => {
    const proof = part.mode === 'proof'
    return orig && orig[k] !== cur[k] ? 'ch' : proof && PATH.includes(k) ? 'pt' : proof && SIBLINGS.includes(k) ? 'pf' : ''
  }
  const draw = () => {
    if (!orig) return
    NODES.forEach(([k]) => {
      const n = root.querySelector(`[data-n="${k}"]`) as HTMLElement
      n.className = 'nd ' + look(k)
      ;(n.lastElementChild as HTMLElement).textContent = cur[k].slice(0, 8)
    })
    root.querySelectorAll('line').forEach((l) => { const c = look(l.dataset.l!); l.setAttribute('class', c === 'pf' ? '' : c) })
    inputs.forEach((inp, i) => inp.classList.toggle('ch', txs[i] !== TXS[i]))
    const changed = LEAVES.filter((k) => orig![k] !== cur[k])
    const swapped = txs[0] === TXS[1] && txs[1] === TXS[0] && txs[2] === TXS[2] && txs[3] === TXS[3]
    if (swapped) note.set('bad', 'Same transactions in a different order give a different root. Order matters!')
    else if (changed.length === 1) {
      const k = changed[0], [up, other] = 'AB'.includes(k) ? ['P', 'Q'] : ['Q', 'P']
      note.set('bad', `Changing ${k} changed H(${k}), ${up} and the root. ${other} stayed the same.`)
    } else if (changed.length) note.set('bad', 'The root changed. One root sums up all four transactions.')
    else note.set(part.mode === 'proof' ? 'ok' : '', part.mode === 'proof' ? 'To check B: hash it, combine with H(A) to get P, then with Q to get the root. It matches!' : '')
  }
  const update = async () => {
    const r = ++run
    const [A, B, C, D] = await Promise.all(txs.map((t) => sha256(t)))
    const [P, Q] = await Promise.all([sha256(A + B), sha256(C + D)])
    const top = await sha256(P + Q)
    if (!on || r !== run) return
    cur = { A, B, C, D, P, Q, root: top }
    orig ??= cur
    draw()
  }
  const setTxs = (t: string[]) => { txs = t; inputs.forEach((inp, i) => (inp.value = t[i])); update() }
  inputs.forEach((inp, i) => (inp.oninput = () => { txs[i] = inp.value; update() }))
  update()
  return {
    set(p) {
      part = p
      const can = p.try !== false
      inputs.forEach((i) => (i.readOnly = !can))
      bar.innerHTML = hint(!can ? 'Four transactions, hashed in pairs, up to one root hash.' : p.mode === 'proof' ? 'To prove B is in the tree you only need the gold hashes: H(A) and Q.' : p.mode === 'swap' ? 'Swap two transactions and watch the root.' : 'Edit any transaction at the bottom. Its path to the root turns red.')
        + (can ? (p.mode === 'swap' ? '<button class="btn sm gold" data-a="swap">Swap A and B</button>' : '') + '<button class="btn sm" data-a="reset">Reset</button>' + note.html() : '')
      if (can) {
        const swap = bar.querySelector<HTMLElement>('[data-a="swap"]')
        if (swap) swap.onclick = () => setTxs([txs[1], txs[0], txs[2], txs[3]])
        byA(bar, 'reset').onclick = () => setTxs([...TXS])
      }
      draw()
    },
    stop() { on = false },
  }
}

/** Proof of stake: validators picked with odds that follow their stake; a provable cheat destroys stake */
const stakeView: ViewMaker = (vis, bar) => {
  vis.innerHTML = '<div class="scene cv"></div>'
  const box = vis.firstElementChild as HTMLElement
  const note = noteLine(bar)
  const START: Record<Name, number> = { Alice: 50, Bob: 30, Charlie: 20 }
  const picks: Record<Name, number> = { Alice: 0, Bob: 0, Charlie: 0 }
  let on = true, part: ScenePart = {}, stake = { ...START }, chosen: Name | null = null, voted = false, busy = false, cheater: Name = 'Bob'
  const total = () => NAMES.reduce((s, n) => s + stake[n], 0)
  const share = (n: Name) => Math.round((stake[n] / total()) * 100)
  const draw = () => {
    const picked = NAMES.reduce((s, n) => s + picks[n], 0)
    box.innerHTML = `<div class="race stk">${NAMES.map((n) => `<div class="rl${chosen === n ? ' win' : ''}${stake[n] < START[n] ? ' cut' : ''}" style="--c:${PCOL[n]}"><div class="av">${n[0]}</div><span class="bar"><i style="width:${(stake[n] / 50) * 100}%"></i></span><span class="n">${voted && chosen !== n ? '✓ ' : ''}${stake[n]} · ${share(n)}%</span></div>`).join('')}</div>`
      + `<p class="lnote">${picked ? `Picked so far: ${NAMES.map((n) => `${n} ${picks[n]}`).join(' · ')}` : 'Bars show the coins each validator has locked up as stake.'}</p>`
  }
  const weighted = (): Name => {
    let r = Math.random() * total()
    for (const n of NAMES) { r -= stake[n]; if (r < 0) return n }
    return NAMES[NAMES.length - 1]
  }
  // spin through the validators, then land on one picked by stake
  const pick = async () => {
    busy = true; voted = false; controls()
    for (let i = 0; i < 9; i++) {
      chosen = NAMES[i % NAMES.length]; draw()
      await sleep(80 + i * 12)
      if (!on) return null
    }
    const n = weighted()
    chosen = n; picks[n]++; busy = false
    controls()
    return n
  }
  const controls = () => {
    const can = part.try !== false, m = part.mode, off = busy ? ' disabled' : ''
    bar.innerHTML = hint(!can ? 'Validators lock up coins as stake. More stake, more chance to be picked.' : m === 'vote' ? 'One validator proposes a block; the others check it and vote.' : m === 'slash' ? 'Cheating is provable, and it costs stake.' : 'Pick a proposer. The odds follow the stake.')
      + (can ? (m === 'vote' ? `<button class="btn sm gold" data-a="vote"${off}>Propose and vote</button>` : `<button class="btn sm gold" data-a="pick"${off}>Pick a proposer</button>`)
        + (!m ? `<button class="btn sm" data-a="many"${off}>Pick 100 times</button>` : '')
        + (m === 'slash' ? `<select data-a="who" aria-label="Who cheats"${off}>${NAMES.map((n) => `<option${n === cheater ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn sm danger" data-a="cheat"${off}>Sign two conflicting blocks</button><button class="btn sm" data-a="reset"${off}>Reset stakes</button>` : '')
        + note.html() : '')
    if (can) {
      const el = (a: string) => bar.querySelector<HTMLElement>(`[data-a="${a}"]`)
      const p = el('pick')
      if (p) p.onclick = async () => {
        const n = await pick()
        if (n) note.set('', `${n} was picked. With ${share(n)}% of the stake, ${n} is picked about ${share(n)}% of the time.`)
      }
      const many = el('many')
      if (many) many.onclick = () => {
        const got: Record<Name, number> = { Alice: 0, Bob: 0, Charlie: 0 }
        for (let i = 0; i < 100; i++) got[weighted()]++
        NAMES.forEach((n) => (picks[n] += got[n]))
        chosen = null; draw()
        note.set('ok', `100 picks: ${NAMES.map((n) => `${n} ${got[n]}`).join(', ')}. Close to their share of the stake!`)
      }
      const vote = el('vote')
      if (vote) vote.onclick = async () => {
        const n = await pick()
        if (!n) return
        voted = true; draw()
        note.set('ok', `${n} proposed a block. The others checked it and voted yes, so it's agreed. Many designs need votes from at least 2/3 of the stake.`)
      }
      const who = el('who') as HTMLSelectElement | null
      if (who) who.onchange = () => { cheater = who.value as Name }
      const cheat = el('cheat')
      if (cheat) cheat.onclick = () => {
        const n = cheater
        stake[n] = Math.floor(stake[n] / 2); chosen = null; voted = false; draw()
        note.set('bad', `${n} voted for two different blocks at once. That's provable, so half of ${n}'s stake is destroyed, and ${n} is picked less often now.`)
      }
      const reset = el('reset')
      if (reset) reset.onclick = () => { stake = { ...START }; chosen = null; voted = false; note.set('', ''); draw() }
    }
    draw()
  }
  return {
    set(p) { part = p; voted = false; controls() },
    stop() { on = false },
  }
}

const VIEWS: Record<string, ViewMaker> = { hash: avalancheView, chain: chainView, search: searchView, race: raceView, lanes: lanesView, merkle: merkleView, stake: stakeView }

/**
 * Mounts a scene for GenericLesson into `host` (a `.nv.gscene` box): the picture on top, its controls underneath.
 * Call `set` with each part's state as the story scrolls. The mining scene switches between views with `mode`.
 */
export function mountScene(host: HTMLElement, scene: SceneName) {
  host.innerHTML = '<div class="gvis"></div><div class="gbar"></div>'
  const vis = host.firstElementChild as HTMLElement, bar = host.lastElementChild as HTMLElement
  let view: View | null = null, key = ''
  return {
    set(p: ScenePart) {
      const k = scene === 'mining' ? p.mode ?? 'search' : scene
      if (k !== key) { view?.stop(); key = k; view = VIEWS[k](vis, bar) }
      view?.set(p)
    },
    destroy() { view?.stop(); view = null; host.innerHTML = '' },
  }
}
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
