/**
 * Previous hash: Genesis → A → B → C. Each block's "prev" chip has the same colour as the hash it points to,
 * so the links are easy to see, and a broken link turns red.
 * Parts: the rule h = H(previous hash + data) · the agreed genesis · an edit to A rippling through B and C ·
 * checking links vs comparing with a trusted record · later edits never touch earlier blocks.
 */
import { at, chip, esc, life, markPick, paint, pickHTML, sha256, tryBox, type SceneMaker } from './kit'

const NAMES = ['Genesis', 'A', 'B', 'C']
const START = ['The agreed start', 'Alice pays Bob 3', 'Bob pays Charlie 1', 'Charlie pays Alice 2']
const link = (prev: string, data: string) => sha256(prev + '||' + data)

type Chain = { prev: string[]; hash: string[] }

/** Every block worked out again from the start: each one uses the new hash of the block before */
async function recompute(pay: string[]): Promise<Chain> {
  const prev: string[] = [], hash: string[] = []
  for (let i = 0; i < pay.length; i++) {
    prev[i] = i ? hash[i - 1] : ''
    hash[i] = await link(prev[i], pay[i])
  }
  return { prev, hash }
}

/** Each block keeps the "prev" it stored when it was written; only its own hash is worked out again */
async function keepPointers(pay: string[], stored: string[]): Promise<Chain> {
  return { prev: [...stored], hash: await Promise.all(pay.map((p, i) => link(stored[i], p))) }
}

const previousHash: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-prev"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    pays: [0, 1, 2, 3, 4].map(() => [...START]), // each part edits its own copy of the data
    record: null as Chain | null, // the trusted record: hashes when the chain was first written
    now: null as Chain | null, // what the scene shows
    reveal: 4, // blocks before this index show their new hashes (the ripple)
    old: null as Chain | null, // hashes before the latest edit (shown until the ripple reaches them)
    method: 'links' as 'links' | 'record', // part 4
    edited: -1, // part 5: which block the learner is editing
  }

  const pay = () => at(st.pays, st.active)

  // works out the chain for the part in view; `animate` ripples the change along the chain
  async function update(animate = false) {
    if (!st.record) return
    const check = lf.run()
    const next = st.active === 3 && st.method === 'links' ? await keepPointers(pay(), st.record.prev) : await recompute(pay())
    if (!check()) return
    const first = st.now ? next.hash.findIndex((h, i) => h !== st.now!.hash[i]) : -1
    st.old = st.now; st.now = next
    if (animate && first >= 0 && ctx.motion) {
      for (st.reveal = first; st.reveal <= 4; st.reveal++) { draw(); await lf.wait(380); if (!check()) return }
    }
    st.reveal = 4
    draw()
  }

  const shown = (i: number) => (i < st.reveal || !st.old ? st.now! : st.old)

  function chainHTML(opts: { gold?: number; marks?: boolean; linkCheck?: boolean }) {
    const rec = st.record!
    return `<div class="gs-pchain">${NAMES.map((n, i) => {
      const c = shown(i)
      const changed = c.hash[i] !== rec.hash[i]
      const prevOk = i === 0 || c.prev[i] === c.hash[i - 1]
      const mark = opts.marks ? (opts.linkCheck ? '' : changed ? '<em class="gs-mark bad">✗</em>' : '<em class="gs-mark ok">✓</em>') : ''
      const arrow = i === 0 ? '' : `<span class="gs-link${prevOk ? '' : ' bad'}${i === st.reveal ? ' pulse' : ''}" style="--c:${prevOk ? 'var(--muted)' : 'var(--coral)'}">${prevOk ? '→' : '✗'}</span>`
      return `${arrow}<div class="gs-pb${opts.gold === i ? ' gold' : ''}${changed && !opts.linkCheck ? ' changed' : ''}${i === st.reveal - 1 && st.reveal < 4 ? ' flash' : ''}">${mark}`
        + `<b>${n}</b><span class="gs-pb-t">${esc(pay()[i]) || '…'}</span>`
        + `<span class="lbl">prev</span>${i ? chip(c.prev[i], 5, prevOk ? '' : 'bad') : '<span class="gs-none">none</span>'}`
        + `<span class="lbl">hash</span>${chip(c.hash[i], 5)}</div>`
    }).join('')}</div>`
  }

  function draw() {
    if (!st.now || !st.record) { paint(box, '<p class="lnote">Building the chain…</p>'); return }
    const k = st.active, c = st.now
    if (k === 0) {
      paint(box, `<div class="gs-formula"><p class="gs-rule">h[B] = H( h[A] ‖ data of B )</p>`
        + `<div class="gs-mix"><div><span class="lbl">h[A]</span>${chip(c.hash[1], 8)}</div><span class="gs-op">‖</span>`
        + `<div><span class="lbl">data of B</span><b class="gs-data">${esc(pay()[2]) || '…'}</b></div></div>`
        + `<span class="gs-op">↓</span><div class="gs-machine">H</div><span class="gs-op">↓</span><div><span class="lbl">h[B]</span>${chip(c.hash[2], 8)}</div>`
        + `<p class="lnote gs-hide-sm">‖ means “join them in one agreed way”.</p></div>`)
    }
    if (k === 1) {
      const moved = c.hash[0] !== st.record.hash[0]
      paint(box, chainHTML({ gold: 0 }) + `<p class="gs-big">${moved ? '<b class="bad">A different history</b> every hash changed' : '<b class="ok">Everyone agrees</b> on the same start'}</p>`)
    }
    if (k === 2) {
      const n = c.hash.filter((h, i) => h !== st.record!.hash[i]).length
      paint(box, chainHTML({}) + `<p class="gs-big">${n ? `<b class="bad">${n}</b> block${n > 1 ? 's have' : ' has'} a new fingerprint` : '<b class="ok">Original</b> nothing edited yet'}</p>`)
    }
    if (k === 3) {
      const links = st.method === 'links'
      const broken = NAMES.filter((_, i) => i && c.prev[i] !== c.hash[i - 1]).length
      const off = c.hash.filter((h, i) => h !== st.record!.hash[i]).length
      paint(box, `<p class="lnote">${links ? 'Checking each stored link' : 'Comparing every hash with the trusted record'}</p>` + chainHTML({ marks: true, linkCheck: links })
        + `<p class="gs-big">${links ? (broken ? `<b class="bad">${broken}</b> broken link` : '<b class="ok">All links fit</b>') : off ? `<b class="bad">${off}</b> blocks don't match` : '<b class="ok">All match</b>'}</p>`)
    }
    if (k >= 4) {
      const off = c.hash.filter((h, i) => h !== st.record!.hash[i]).length
      paint(box, chainHTML({ marks: true }) + `<p class="gs-big">${off ? `<b class="ok">${4 - off}</b> earlier block${4 - off > 1 ? 's' : ''} untouched` : '<b class="ok">All match</b>'}</p>`)
    }
  }

  recompute(START).then((c) => { if (!lf.alive()) return; st.record = c; st.now = c; draw() })

  /** a text box in part `k` that edits block `i` (and a Reset button) */
  function editor(host: HTMLElement, k: number, i: number, label: string, onText: (v: string) => void) {
    const t = tryBox(host, `<span class="down">${label}</span><input type="text" class="txt" data-a="in" aria-label="${label}" value="${esc(START[i])}"><button class="btn sm" data-a="reset">Reset</button>`)
    const inp = t.q<HTMLInputElement>('in')
    inp.oninput = () => { st.pays[k][i] = inp.value; onText(inp.value) }
    t.q('reset').onclick = () => { st.pays[k][i] = START[i]; inp.value = START[i]; onText(START[i]) }
    return t
  }

  return {
    show(k) {
      st.active = k
      st.old = null
      if (st.record) update()
      else draw()
    },
    tryIt(k, host) {
      if (k === 0) {
        const t = editor(host, 0, 2, 'Data of B:', (v) => { update(); t.msg('', v === START[2] ? '' : 'New data for B, so a new hash for B.') })
      }
      if (k === 1) {
        const t = editor(host, 1, 0, 'Genesis:', (v) => {
          update()
          t.msg(v === START[0] ? 'ok' : 'bad', v === START[0] ? 'Back to the start everyone agreed on.' : 'A different start means every block after it gets a different hash: a whole different history.')
        })
      }
      if (k === 2) {
        const t = editor(host, 2, 1, 'Data of A:', (v) => {
          update(true)
          t.msg(v === START[1] ? 'ok' : 'bad', v === START[1] ? 'Back to the original chain.' : "A changed, so B changed, so C changed, even though C's own data is the same.")
        })
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="edit">Edit A</button><span class="down">Check by:</span>' + pickHTML('m', ['links', 'record'], st.method, (m) => (m === 'links' ? 'Checking each link' : 'Comparing with the record')))
        const p = st.pays[3]
        const report = () => {
          const edited = p[1] !== START[1]
          t.q('edit').textContent = edited ? 'Undo the edit' : 'Edit A'
          if (!edited) t.msg('', 'Edit A, then try both ways of checking.')
          else t.msg('bad', st.method === 'links' ? "Checking links finds one broken link, right after A: B still points to A's old hash." : 'Comparing with the record marks A and every block after it.')
          update()
        }
        t.q('edit').onclick = () => { p[1] = p[1] === START[1] ? 'Alice pays Bob 30' : START[1]; report() }
        t.all('[data-m]').forEach((b) => (b.onclick = () => { st.method = b.dataset.m as 'links' | 'record'; markPick(host, 'm', st.method); report() }))
      }
      if (k === 4) {
        const t = tryBox(host, `<select data-a="pick" aria-label="Block to edit">${[1, 2, 3].map((i) => `<option value="${i}">Edit ${NAMES[i]}</option>`).join('')}</select><input type="text" class="txt" data-a="in" aria-label="Block data" value="${esc(START[1])}"><button class="btn sm" data-a="reset">Reset</button>`)
        const pick = t.q<HTMLSelectElement>('pick'), inp = t.q<HTMLInputElement>('in'), p = st.pays[4]
        const report = () => {
          const i = +pick.value
          update()
          const edited = p[i] !== START[i]
          const before = NAMES.slice(0, i), list = before.length > 1 ? `${before.slice(0, -1).join(', ')} and ${before[before.length - 1]} stay` : `${before[0]} stays`
          t.msg(edited ? 'ok' : '', edited ? `${list} the same. Links only point backwards, so a later edit can't reach earlier blocks.` : '')
        }
        const restart = () => { p.splice(0, 4, ...START); inp.value = START[+pick.value]; report() }
        pick.onchange = restart
        inp.oninput = () => { p[+pick.value] = inp.value; report() }
        t.q('reset').onclick = restart
      }
    },
    caption: (k) => at([
      "Each hash is made from the previous hash plus this block's data.",
      'Genesis is the agreed first block. Everything builds on it.',
      'Same-colour chips show which hash each block points to.',
      'Two ways to check. They mark different blocks.',
      'Links point backwards, so earlier blocks never change.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default previousHash
