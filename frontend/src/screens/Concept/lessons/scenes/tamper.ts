/**
 * Tamper detection: five blocks, each with its fingerprint from the trusted record underneath. A checker sweeps
 * along the chain and marks each block ✓ or ✗, so an edit turns red from that block to the end.
 * Parts: the comparison · predict, then check · links across chapters · undoing a local experiment ·
 * what a mismatch can't tell you (and a replaced record).
 */
import { at, chip, esc, life, markPick, paint, pickHTML, sha256, tryBox, type SceneMaker } from './kit'

const START = ['Alice pays Bob 3', 'Bob pays Charlie 1', 'Charlie pays Dan 2', 'Dan pays Alice 4', 'Alice pays Charlie 1']
const EDIT = ['Alice pays Bob 300', 'Bob pays Charlie 100', 'Charlie pays Dan 200', 'Dan pays Alice 400', 'Alice pays Charlie 100']

type Part = { pay: string[]; record: string[] | null; replaced: boolean; separate: boolean; hash: string[]; checked: boolean }

const tamper: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-tamper"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const parts: Part[] = [0, 1, 2, 3, 4].map(() => ({ pay: [...START], record: null, replaced: false, separate: false, hash: [], checked: true }))
  let active = 0, scan = 5 // blocks before `scan` show their ✓ / ✗
  const P = () => at(parts, active)

  async function hashes(p: Part) {
    const h: string[] = []
    for (let i = 0; i < 5; i++) h[i] = await sha256((i && !(p.separate && i === 3) ? h[i - 1] : '') + '|' + p.pay[i])
    return h
  }
  /** hash part `p` again; `sweep` runs the checker along the chain */
  async function check(p: Part, sweep: boolean) {
    const go = lf.run()
    const h = await hashes(p)
    if (!go()) return
    p.hash = h
    p.record ??= [...h]
    p.checked = sweep || p.checked
    if (p !== P()) return
    if (sweep && ctx.motion) {
      for (scan = 0; scan <= 5; scan++) { draw(); await lf.wait(330); if (!go()) return }
    }
    scan = 5
    draw()
  }

  function draw() {
    const p = P()
    if (!p.record || !p.hash.length) { paint(box, '<p class="lnote">Building the chain…</p>'); return }
    const cell = (i: number) => {
      const ok = p.hash[i] === p.record![i]
      const shown = p.checked && i < scan
      const look = !shown ? (i === scan ? ' scanning' : '') : ok ? ' ok' : ' bad'
      return `<div class="gs-tb${look}${p.pay[i] !== START[i] ? ' edited' : ''}"><b><span class="gs-long">Block </span>${i + 1}</b><span class="gs-tb-t">${esc(p.pay[i]) || '…'}</span>`
        + `${chip(p.hash[i], 5)}<span class="gs-rec${p.replaced ? ' warn' : ''}"><span class="lbl">record</span>${chip(p.record![i], 5)}</span>`
        + `<em class="gs-mark">${!shown ? '?' : ok ? '✓' : '✗'}</em></div>`
    }
    const row = (from: number, to: number) => Array.from({ length: to - from }, (_, j) => (j ? '<span class="gs-tl">→</span>' : '') + cell(from + j)).join('')
    let html = active === 2
      ? `<div class="gs-chapters"><div class="gs-ch"><span class="lbl">Chapter 1</span><div class="gs-trow">${row(0, 3)}</div></div>`
        + `<span class="gs-tl${p.separate ? ' cut' : ''}">${p.separate ? '✂' : '→'}</span><div class="gs-ch"><span class="lbl">Chapter 2</span><div class="gs-trow">${row(3, 5)}</div></div></div>`
      : `<div class="gs-trow">${row(0, 5)}</div>`
    const bad = p.hash.filter((h, i) => h !== p.record![i]).length
    if (active === 3) html = `<p class="gs-shared">🔒 Shared original: <b class="ok">never changed</b></p><p class="lnote">Your copy</p>` + html
    const summary = !p.checked ? '<b>?</b> not checked yet'
      : scan < 5 ? 'Checking…'
      : p.replaced && !bad ? '<b class="warn">⚠ All match</b> but the record was replaced'
      : bad ? `<b class="bad">${bad}</b> block${bad > 1 ? 's' : ''} don't match` : '<b class="ok">All 5</b> match the record'
    paint(box, html + `<p class="gs-big">${summary}</p>`)
  }

  check(parts[0], false)

  /** a block picker and text box that edit part `k`'s chain */
  function blockEditor(k: number, extra: string) {
    return `<select data-a="pick" aria-label="Block to edit">${START.map((_, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>Block ${i + 1}</option>`).join('')}</select>`
      + `<input type="text" class="txt" data-a="in" aria-label="Block data" value="${esc(parts[k].pay[2])}">${extra}`
  }

  return {
    show(k) { active = k; scan = 5; check(P(), false) },
    tryIt(k, host) {
      const p = parts[k]
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="run">Run the checker</button>')
        t.q('run').onclick = async () => { await check(p, true); t.msg('ok', 'Every block hashes to the same fingerprint as the trusted record.') }
      }
      if (k === 1) {
        const t = tryBox(host, blockEditor(1, '<button class="btn sm" data-a="make">Make an edit</button>')
          + '<span class="down" data-a="ask">Which blocks will fail the check?</span><span data-a="guesses"></span><button class="btn sm" data-a="reset">Reset</button>')
        const pick = t.q<HTMLSelectElement>('pick'), inp = t.q<HTMLInputElement>('in')
        const edited = () => p.pay.some((x, i) => x !== START[i])
        // the guesses name the first edited block (or the picked one before any edit)
        const guesses = () => {
          const first = p.pay.findIndex((x, i) => x !== START[i]), b = (first < 0 ? +pick.value : first) + 1
          const opts = b < 5 ? [['only', `Only block ${b}`], ['after', `Blocks ${b} to 5`], ['all', 'All of them']] : [['only', 'Only block 5'], ['all', 'All of them']]
          t.q<HTMLElement>('guesses').innerHTML = opts.map(([g, l]) => `<button class="btn sm" data-g="${g}">${l}</button>`).join('')
          t.all('[data-g]').forEach((btn) => (btn.onclick = () => predict(btn.dataset.g!)))
        }
        const changed = async () => { guesses(); p.checked = false; await check(p, false); t.msg('', edited() ? 'Now predict: which blocks will fail?' : 'Change the text of a block first.') }
        const predict = async (g: string) => {
          if (!edited()) { t.msg('', 'Change the text of a block first.'); return }
          await check(p, true)
          const first = p.hash.findIndex((h, i) => h !== p.record![i])
          const right = first < 0 ? false : g === 'after' || (g === 'only' && first === 4)
          t.msg(right ? 'ok' : 'bad', first < 0 ? 'Every block still matches.' : `${right ? 'Right!' : 'Not quite.'} Blocks ${first + 1} to 5 fail: block ${first + 1} changed, and every block after it uses the hash before it. Blocks before it still match.`)
          if (right) ctx.say('Nice prediction! The red always runs from the edit to the end.')
        }
        pick.onchange = () => { inp.value = p.pay[+pick.value]; guesses() }
        inp.oninput = () => { p.pay[+pick.value] = inp.value; changed() }
        t.q('make').onclick = () => { const i = +pick.value; p.pay[i] = EDIT[i]; inp.value = EDIT[i]; changed() }
        t.q('reset').onclick = async () => { p.pay = [...START]; inp.value = START[+pick.value]; guesses(); await check(p, false); t.msg('', '') }
        guesses()
      }
      if (k === 2) {
        const t = tryBox(host, pickHTML('s', ['linked', 'separate'], 'linked', (v) => (v === 'linked' ? 'Linked across chapters' : 'Two separate chains')) + '<button class="btn sm danger" data-a="edit">Edit block 2</button>')
        const report = async () => {
          t.q('edit').textContent = p.pay[1] === START[1] ? 'Edit block 2' : 'Undo the edit'
          // the record holds the original chain's fingerprints under the chosen linking rule
          p.record = await hashes({ ...p, pay: [...START] })
          await check(p, true)
          const edited = p.pay[1] !== START[1]
          t.msg(edited ? 'bad' : '', !edited ? '' : p.separate ? 'The red stops at the end of chapter 1: chapter 2 is its own chain.' : 'The red runs straight on into chapter 2, because block 4 holds block 3’s hash.')
        }
        t.all('[data-s]').forEach((b) => (b.onclick = () => { p.separate = b.dataset.s === 'separate'; markPick(host, 's', b.dataset.s!); report() }))
        t.q('edit').onclick = () => { p.pay[1] = p.pay[1] === START[1] ? EDIT[1] : START[1]; report() }
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="edit">Edit block 3</button><button class="btn sm" data-a="undo" disabled>Undo my edit</button>')
        const set = async (v: string) => {
          p.pay[2] = v
          t.q('edit').disabled = v !== START[2]; t.q('undo').disabled = v === START[2]
          await check(p, true)
          t.msg(v === START[2] ? 'ok' : 'bad', v === START[2] ? 'Undone: all five match again. The shared original was never touched.' : 'Your copy fails from block 3 on. The shared original is safe: you only changed your own copy.')
        }
        t.q('edit').onclick = () => set(EDIT[2])
        t.q('undo').onclick = () => set(START[2])
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="edit">Edit block 3</button><button class="btn sm danger" data-a="over">Overwrite the trusted record</button><button class="btn sm" data-a="who">Who changed it?</button><button class="btn sm" data-a="reset">Reset</button>')
        t.q('edit').onclick = async () => { p.pay[2] = EDIT[2]; await check(p, true); t.msg('bad', 'Blocks 3 to 5 no longer match the record.') }
        t.q('over').onclick = async () => {
          if (!p.hash.length) return
          p.record = [...p.hash]; p.replaced = true
          await check(p, true)
          t.msg('bad', 'Everything “matches” now. Without another trusted copy of the old fingerprints, nobody can tell the history changed.')
          ctx.say('Sneaky! That’s why the next moons make rewriting cost real work.')
        }
        t.q('who').onclick = () => t.msg('', "The checker can't say. A mismatch only proves the bytes are different. It can't tell who changed them, or whether the new text is true.")
        t.q('reset').onclick = async () => { p.pay = [...START]; p.record = null; p.replaced = false; await check(p, false); t.msg('', '') }
      }
    },
    caption: (k) => at([
      'Under each block: its fingerprint from the trusted record.',
      'Edit one block, then predict where the red will spread.',
      'Chapters are just labels. The links decide.',
      'Experiment on your copy. Undo puts it back.',
      'A mismatch shows a change, not who made it.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default tamper
