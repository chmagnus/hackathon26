/**
 * Nonce: a block with a nonce counter (digits roll as it changes) and its hash, whose first characters must
 * fill the target slots with zeros.
 * Parts: hashing again gives the same miss · spin nonces until it fits · near misses don't help ·
 * a tiny nonce field runs out (change the extra field) · a nonce only counts with its block.
 */
import { at, esc, life, paint, sha256, tryBox, type SceneMaker } from './kit'
import { CHAIN_DATA } from '../storyKit'

const TX = CHAIN_DATA.join('\n')
const FIELD = 99 // part 4's tiny nonce field: 0–99

type Search = { nonce: number; extra: number; hash: string; tries: number; found: boolean; again: number; history: [number, string][] }
const blank = (): Search => ({ nonce: 0, extra: 0, hash: '', tries: 0, found: false, again: 0, history: [] })
const hashOf = (s: { nonce: number; extra: number }) => sha256(`${TX}|${s.extra}|${s.nonce}`)

const nonceScene: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-nonce"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const parts = [0, 1, 2, 3, 4].map(blank)
  let active = 0, lastNonce = -1
  let proof = { nonce: 0, hash: '' } // part 5: a solved block
  const S = () => at(parts, active)
  const zeros = (k = active) => (k === 3 ? 3 : 2)

  const odometer = (n: number, width: number) => {
    const digits = String(n).padStart(width, '0')
    const old = String(Math.max(lastNonce, 0)).padStart(width, '0')
    return `<span class="gs-odo">${[...digits].map((d, i) => `<i${d !== old[i] && lastNonce >= 0 ? ' class="roll"' : ''}>${d}</i>`).join('')}</span>`
  }
  const target = (h: string, z: number) => `<span class="gs-target">${Array.from({ length: z }, (_, i) => `<i class="${h ? (h[i] === '0' ? 'hit' : 'miss') : ''}">${h ? h[i] : '0'}</i>`).join('')}</span><span class="gs-rest mono">${h.slice(z, 22)}…</span>`

  function draw() {
    const s = S(), k = active, z = zeros()
    if (k >= 4) {
      paint(box, `<div class="gs-claims"><div class="gs-claim bad"><span class="lbl">Just a number</span><b class="gs-num">${proof.nonce}</b><span>✗ Check it against what?</span></div>`
        + `<div class="gs-claim ok"><span class="lbl">Block + nonce + target</span><span class="mono gs-tx">${esc(CHAIN_DATA[0])}…</span><b class="gs-num">${proof.nonce}</b>${target(proof.hash, 2)}<span>✓ One hash to check</span></div></div>`)
      return
    }
    const width = k === 3 ? 2 : Math.max(3, String(s.nonce).length)
    const block = `<div class="gs-nblock"><span class="lbl">Block</span><span class="mono gs-tx">${CHAIN_DATA.map(esc).join('<br>')}</span>`
      + `<div class="gs-nrow"><span class="lbl">Nonce</span>${odometer(s.nonce, width)}${k === 3 ? `<span class="lbl">Extra</span><b class="gs-extra">${s.extra}</b>` : ''}</div></div>`
    const state = s.found ? '<b class="ok">✓ It fits!</b>' : s.hash ? `<b class="bad">✗ Miss</b>` : ''
    const hist = k === 2 && s.history.length ? `<div class="gs-hist">${s.history.map(([n, h]) => `<span><em>${n}</em>${h.slice(0, 2)}</span>`).join('')}</div>` : ''
    const note = k === 0 ? `<p class="lnote">${s.again ? `Hashed ${s.again + 1} times: the same hash every time.` : 'Nonce 0 misses the target.'}</p>`
      : k === 3 ? `<p class="lnote">This toy nonce field only holds 0–${FIELD}. Target: ${'0'.repeat(z)} (about 1 in ${(16 ** z).toLocaleString()}).</p>`
      : `<p class="lnote">${s.tries ? `${s.tries.toLocaleString()} ${s.tries === 1 ? 'try' : 'tries'}` : 'Target: the hash must start with ' + '0'.repeat(z)}</p>`
    paint(box, `${block}<div class="gs-out${s.found ? ' won' : ''}"><span class="lbl">Hash</span><div class="gs-hline">${target(s.hash, z)}</div>${state}</div>${hist}${note}`)
  }

  async function rehash(s: Search) {
    const h = await hashOf(s)
    if (!lf.alive()) return false
    s.hash = h
    s.found = h.startsWith('0'.repeat(zeros(parts.indexOf(s))))
    return true
  }
  const redraw = (s: Search) => { if (s === S()) draw(); lastNonce = s.nonce }

  for (const s of parts) void rehash(s).then(() => redraw(s))
  ;(async () => {
    const p = { nonce: 0, extra: 0 }
    let h = await hashOf(p)
    while (!h.startsWith('00')) { p.nonce++; h = await hashOf(p) }
    proof = { nonce: p.nonce, hash: h }
    if (active >= 4) draw()
  })()

  /** tries the next nonce in part `s`; returns false once it's out of range */
  async function next(s: Search, max = Infinity) {
    if (s.found) return false
    if (s.nonce >= max) return false
    lastNonce = s.nonce
    s.nonce++; s.tries++
    if (!(await rehash(s))) return false
    s.history = [...s.history, [s.nonce, s.hash] as [number, string]].slice(-8)
    return true
  }
  /** keeps trying nonces until `stop` says so; the counter visibly rolls */
  async function spin(s: Search, stop: () => boolean, max = Infinity, perFrame = 3) {
    const go = lf.run()
    while (!stop()) {
      for (let i = 0; i < perFrame && !stop(); i++) if (!(await next(s, max))) return go()
      if (!go()) return false
      redraw(s)
      await new Promise((r) => setTimeout(r, ctx.motion ? 30 : 0))
    }
    redraw(s)
    return go()
  }

  return {
    show(k) { active = k; lastNonce = -1; draw() },
    tryIt(k, host) {
      const s = parts[k]
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm" data-a="again">Hash it again</button>')
        t.q('again').onclick = async () => {
          s.again++
          await rehash(s); redraw(s)
          t.msg('', `Still ${s.hash.slice(0, 6)}…, still a miss. The same block always gives the same hash. We need to change something: the nonce.`)
        }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm" data-a="next">Next nonce</button><button class="btn sm gold" data-a="spin">Spin until it fits</button><button class="btn sm" data-a="reset">Reset</button>')
        const done = () => {
          t.msg(s.found ? 'ok' : '', s.found ? `Nonce ${s.nonce} works! It took ${s.tries + 1} tries. It could have taken 3, or 3,000.` : `Nonce ${s.nonce} misses. Each nonce gives a fresh-looking hash.`)
        }
        t.q('next').onclick = async () => { lf.run(); if (await next(s)) { redraw(s); done() } }
        t.q('spin').onclick = async () => { if (s.found) return; if (await spin(s, () => s.found)) done() }
        t.q('reset').onclick = async () => { lf.run(); Object.assign(s, blank()); await rehash(s); redraw(s); t.msg('', '') }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="near">Find a near miss</button><button class="btn sm" data-a="next">Try the next nonce</button>')
        const isNear = () => s.hash.startsWith('0') && !s.hash.startsWith('00')
        t.q('near').onclick = async () => {
          s.found = false
          // step at least once, then stop on a hash with exactly one leading zero
          await next(s)
          if (await spin(s, () => isNear() || s.found)) {
            t.msg('', s.found ? 'Oh, that one actually fits! Try again for a near miss.' : `Nonce ${s.nonce} starts with one 0. So close! Will the next nonce fit?`)
          }
        }
        t.q('next').onclick = async () => {
          lf.run()
          const was = isNear()
          if (s.found) s.found = false
          if (!(await next(s))) return
          redraw(s)
          t.msg('', s.found ? 'It fits! But that was luck, not because the last one was close.' : was ? `Nope: ${s.hash.slice(0, 2)}… Hashes don't get “warmer”. A near miss says nothing about the next nonce.` : 'Each nonce is a brand-new roll.')
        }
      }
      if (k === 3) {
        const t = tryBox(host, `<button class="btn sm gold" data-a="search">Search all ${FIELD + 1} nonces</button><button class="btn sm" data-a="extra" disabled>Change the extra field</button>`)
        t.q('search').onclick = async () => {
          if (s.found) return
          t.q('search').disabled = true
          const ok = await spin(s, () => s.found || s.nonce >= FIELD, FIELD, 2)
          if (!ok) return
          t.q('search').disabled = s.found
          t.q('extra').disabled = s.found
          t.msg(s.found ? 'ok' : 'bad', s.found ? `Found one: extra ${s.extra}, nonce ${s.nonce}. Changing the extra field gave fresh candidates.` : 'Out of nonces! Every number from 0 to 99 missed. Change another allowed field, then search again.')
        }
        t.q('extra').onclick = async () => {
          s.extra++; s.nonce = 0; lastNonce = -1
          await rehash(s); redraw(s)
          t.q('extra').disabled = true; t.q('search').disabled = false
          t.msg('', `Extra is now ${s.extra}. Same payments, but a whole new set of 100 candidates. Search again!`)
        }
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="alone">Check the nonce on its own</button><button class="btn sm gold" data-a="with">Check it with its block</button>')
        t.q('alone').onclick = () => t.msg('bad', `“${proof.nonce}” proves nothing on its own. A nonce only means something with the exact block and the target it was found for.`)
        t.q('with').onclick = () => t.msg('ok', `Hash the block with nonce ${proof.nonce}: ${proof.hash.slice(0, 8)}… starts with 00. One hash, checked!`)
      }
    },
    caption: (k) => at([
      'Same input, same hash. Hashing again never helps.',
      'Roll the nonce until the first two characters are 0.',
      'Hashes never get “warmer”.',
      'Out of nonces? Change another field and keep going.',
      'A nonce only counts together with its block and target.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default nonceScene
