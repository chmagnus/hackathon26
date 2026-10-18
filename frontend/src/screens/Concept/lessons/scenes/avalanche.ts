/**
 * Avalanche effect: two fingerprints as walls of tiles (and of bits), side by side.
 * Parts: one changed character · bits flipped (about half) · tiny vs huge edits look the same ·
 * a fingerprint fed into the next record · a single space (and tidying text first).
 */
import { at, diff, esc, life, paint, sha256, tilesHTML, tryBox, type SceneMaker } from './kit'

const ORIGINAL = 'Alice pays Bob 3'
const NEXT = 'Bob pays Charlie 1' // record 2's own text (part 4)
const HUGE = ['Charlie bought pizza for the whole class', 'The ledger is now a poem about space', 'Alice pays Bob 3 and also 900 more coins', 'Totally different text!']

/** How many of the 256 bits differ, and which */
function bits(a: string, b: string) {
  const flip: boolean[] = []
  for (let i = 0; i < 64; i++) {
    const x = parseInt(a[i] ?? '0', 16) ^ parseInt(b[i] ?? '0', 16)
    for (let s = 3; s >= 0; s--) flip.push(!!((x >> s) & 1))
  }
  return { flip, count: flip.filter(Boolean).length }
}

/** Shows spaces so the learner can see them */
const shown = (t: string) => esc(t).replace(/ /g, '<span class="gs-sp">·</span>')

const avalanche: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-ava"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const H: Record<string, string> = {} // text -> hash
  const st = {
    active: 0,
    copy: 'Alice pays Bob 4', // parts 1 and 2
    flips: [] as number[], // part 2: bits flipped by each one-letter change
    tiny: 'Alice pays Bob 4', huge: HUGE[0], // part 3
    rec1: ORIGINAL, // part 4
    space: true, tidy: false, // part 5
  }
  const tidyText = (t: string) => (st.tidy ? t.trim().replace(/\s+/g, ' ') : t)
  const spaced = () => ORIGINAL + (st.space ? ' ' : '')

  // every text the scene needs, hashed (record 2 hashes record 1's fingerprint + its own text)
  const texts = () => [ORIGINAL, st.copy, st.tiny, st.huge, st.rec1, tidyText(ORIGINAL), tidyText(spaced())]
  const rec2 = (h1: string) => h1 + '|' + NEXT
  async function hashAll() {
    for (const t of texts()) if (!H[t]) H[t] = await sha256(t)
    for (const t of [ORIGINAL, st.rec1]) { const r = rec2(H[t]); if (!H[r]) H[r] = await sha256(r) }
    if (lf.alive()) draw()
  }
  const card = (label: string, text: string, h: string, mask?: boolean[], tiles = '', spaces = false) =>
    `<div class="gs-ava-card${tiles ? ' wide' : ''}"><b>${label}</b><span class="gs-ava-t">${spaces ? shown(text) : esc(text)}</span>${tilesHTML(h, mask, tiles)}</div>`

  function draw() {
    const o = H[ORIGINAL]
    if (!o) { paint(box, '<p class="lnote">Making fingerprints…</p>'); return }
    const k = st.active
    if (k === 0) {
      const c = H[st.copy] ?? ''
      const { mask, count } = diff(o, c)
      paint(box, `<div class="gs-ava-pair">${card('Original', ORIGINAL, o)}${card('Your copy', st.copy, c, mask)}</div>`
        + `<p class="gs-big">${count ? `<b>${count}</b> of 64 characters changed` : '<b class="ok">Identical</b> same text, same fingerprint'}</p>`)
    }
    if (k === 1) {
      const c = H[st.copy] ?? ''
      const { flip, count } = bits(o, c)
      paint(box, `<div class="gs-bits">${flip.map((f) => `<i${f ? ' class="d"' : ''}></i>`).join('')}</div>`
        + `<p class="gs-big"><b>${count}</b> of 256 bits flipped${count ? ` <span class="down">(half would be 128)</span>` : ''}</p>`
        + `<p class="lnote">“${esc(ORIGINAL)}” → “${esc(st.copy)}”</p>`)
    }
    if (k === 2) {
      const row = (label: string, text: string) => {
        const h = H[text] ?? '', { mask, count } = diff(o, h)
        return `<div class="gs-ava-row"><div class="gs-ava-lab"><b>${label}</b><span class="gs-ava-t">${esc(text)}</span></div>${tilesHTML(h, mask, 'strip')}<span class="gs-n">${count}/64</span></div>`
      }
      paint(box, `<p class="lnote gs-hide-sm">Both compared with “${esc(ORIGINAL)}”</p>${row('Tiny edit', st.tiny)}${row('Huge edit', st.huge)}`
        + '<p class="lnote">Both fingerprints look just as different.</p>')
    }
    if (k === 3) {
      const h1 = H[st.rec1] ?? '', o2 = H[rec2(o)] ?? '', h2 = H[rec2(h1)] ?? ''
      const m1 = diff(o, h1), m2 = diff(o2, h2)
      paint(box, `<div class="gs-ava-chain">${card('Record 1', st.rec1, h1, m1.mask, 'strip')}<div class="gs-ava-link">↓ its fingerprint goes into record 2 ↓</div>`
        + `${card('Record 2', `[record 1's fingerprint] + ${NEXT}`, h2, m2.mask, 'strip')}</div>`
        + `<p class="gs-big">${m1.count ? '<b class="bad">Both</b> fingerprints changed' : '<b class="ok">Nothing</b> changed yet'}</p>`)
    }
    if (k >= 4) {
      const a = H[tidyText(ORIGINAL)] ?? '', b = H[tidyText(spaced())] ?? ''
      const { mask, count } = diff(a, b)
      paint(box, `<div class="gs-ava-pair">${card('Original', tidyText(ORIGINAL), a, undefined, '', true)}${card(st.tidy ? 'Copy, tidied first' : 'Copy', tidyText(spaced()), b, mask, '', true)}</div>`
        + `<p class="gs-big">${count ? `<b>${count}</b> of 64 characters changed` : '<b class="ok">Identical</b> fingerprints'}</p>`)
    }
  }

  void hashAll()
  return {
    show(k) { st.active = k; draw() },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, `<input type="text" class="txt" data-a="in" aria-label="Your copy" value="${esc(st.copy)}"><button class="btn sm" data-a="reset">Reset</button>`)
        const set = (v: string) => {
          st.copy = v
          hashAll().then(() => { const n = diff(H[ORIGINAL], H[v] ?? H[ORIGINAL]).count; if (st.copy === v) t.msg('', n ? `Only the text changed a little, but ${n} of 64 characters of the fingerprint changed.` : 'Same text as the original, so the same fingerprint.') })
        }
        t.q<HTMLInputElement>('in').oninput = (e) => set((e.target as HTMLInputElement).value)
        t.q('reset').onclick = () => { t.q<HTMLInputElement>('in').value = 'Alice pays Bob 4'; set('Alice pays Bob 4') }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="one">Change the last digit</button><span class="down" data-a="list"></span>')
        t.q('one').onclick = async () => {
          const d = +(st.copy.match(/(\d)$/)?.[1] ?? 3)
          const next = (d + 1) % 10 === 3 ? (d + 2) % 10 : (d + 1) % 10
          st.copy = ORIGINAL.slice(0, -1) + next
          await hashAll()
          if (!lf.alive()) return
          const n = bits(H[ORIGINAL], H[st.copy]).count
          st.flips = [...st.flips, n].slice(-6)
          t.q<HTMLElement>('list').textContent = 'Bits flipped: ' + st.flips.join(', ')
          t.msg('', `“3” became “${next}”: ${n} bits flipped.` + (st.flips.length >= 3 ? ' Always close to half, never exactly the same!' : ' Try a few more.'))
          if (st.flips.length === 3) ctx.say('See? Around half the bits flip every time, but never exactly 128.')
        }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm" data-a="tiny">New tiny edit</button><button class="btn sm" data-a="huge">New huge edit</button>')
        let ti = 4, hi = 0
        const report = async () => {
          await hashAll()
          if (!lf.alive()) return
          const a = diff(H[ORIGINAL], H[st.tiny]).count, b = diff(H[ORIGINAL], H[st.huge]).count
          t.msg('', `Tiny edit: ${a} of 64 changed. Huge edit: ${b} of 64. From the fingerprints alone, you can't tell which edit was bigger.`)
        }
        t.q('tiny').onclick = () => { ti = (ti + 1) % 10 || 1; st.tiny = ORIGINAL.slice(0, -1) + (ti === 3 ? 9 : ti); report() }
        t.q('huge').onclick = () => { hi = (hi + 1) % HUGE.length; st.huge = HUGE[hi]; report() }
      }
      if (k === 3) {
        const t = tryBox(host, `<span class="down">Record 1:</span><input type="text" class="txt" data-a="in" aria-label="Record 1" value="${esc(st.rec1)}"><button class="btn sm" data-a="reset">Reset</button>`)
        const set = (v: string) => {
          st.rec1 = v
          hashAll().then(() => {
            if (st.rec1 !== v) return
            t.msg(v === ORIGINAL ? 'ok' : 'bad', v === ORIGINAL ? 'Back to the original: both fingerprints match again.' : "Record 2's own text didn't change, but its fingerprint did, because it includes record 1's fingerprint.")
          })
        }
        t.q<HTMLInputElement>('in').oninput = (e) => set((e.target as HTMLInputElement).value)
        t.q('reset').onclick = () => { t.q<HTMLInputElement>('in').value = ORIGINAL; set(ORIGINAL) }
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm" data-a="space">Remove the space</button><button class="btn sm" data-a="tidy">Tidy the text first: off</button>')
        const report = async () => {
          t.q('space').textContent = st.space ? 'Remove the space' : 'Add a space at the end'
          t.q('tidy').textContent = `Tidy the text first: ${st.tidy ? 'on' : 'off'}`
          t.q('tidy').classList.toggle('on', st.tidy)
          await hashAll()
          if (!lf.alive()) return
          const same = H[tidyText(ORIGINAL)] === H[tidyText(spaced())]
          t.msg(same ? 'ok' : 'bad', !st.space ? 'No extra space: same text, same fingerprint.' : st.tidy ? 'Both texts were tidied the agreed way first, so the extra space is ignored.' : 'Just one space at the end, and the fingerprint is completely different.')
        }
        t.q('space').onclick = () => { st.space = !st.space; report() }
        t.q('tidy').onclick = () => { st.tidy = !st.tidy; report() }
      }
    },
    caption: (k) => at([
      'Gold tiles: characters of the fingerprint that changed.',
      'Each square is one of the 256 bits. Gold ones flipped.',
      "A tiny edit and a huge edit look just as different.",
      'Change record 1, and record 2’s fingerprint changes too.',
      'A single space is a different input.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default avalanche
