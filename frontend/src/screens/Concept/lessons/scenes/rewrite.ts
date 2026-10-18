/**
 * Why rewriting must cost something: a plain hash chain can be rebuilt in a blink, so add work.
 * Parts: edit + recompute a plain chain · two tidy branches (only the original fingerprints tell them apart) ·
 * a cheap rewrite vs a costly one racing a moving target · work can't fix a fake signature · the two jobs side by side.
 */
import { at, chip, esc, life, paint, sha256, tryBox, type SceneMaker } from './kit'
import { CHAIN_DATA } from '../storyKit'

const FAKE = 'Alice pays Bob 200'
type Mini = { data: string; prev: string; hash: string }

/** A plain chain: each block hashes the previous hash + its data. `keep` keeps the stored prev links instead of updating them */
async function chainOf(data: string[], keep?: Mini[]): Promise<Mini[]> {
  const c: Mini[] = []
  for (let i = 0; i < data.length; i++) {
    const prev = keep ? keep[i].prev : i ? c[i - 1].hash : ''
    c.push({ data: data[i], prev, hash: await sha256(prev + '|' + data[i]) })
  }
  return c
}

const rewrite: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-rw"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    orig: [] as Mini[], fake: [] as Mini[], // the original chain and a fully rebuilt rewrite
    p1: [] as Mini[], p1Hashes: 0, // part 1: the learner's chain, and how many hashes the rebuild took
    record: false, // part 2: does the viewer have the original fingerprints?
    race: null as null | { mined: number; guesses: number; honest: number; done: boolean },
    sent: null as null | { good: boolean; checked: number }, // part 4
  }

  const mini = (c: Mini[], opts: { record?: boolean; extra?: number; label?: string; tone?: string } = {}) => {
    const blocks = c.map((b, i) => {
      const linkOk = i === 0 || b.prev === c[i - 1].hash
      const recOk = !opts.record || b.hash === st.orig[i]?.hash
      return `${i ? `<span class="gs-link${linkOk ? '' : ' bad'}">${linkOk ? '→' : '✗'}</span>` : ''}<div class="gs-mb${recOk ? '' : ' bad'}${b.data !== CHAIN_DATA[i] ? ' edited' : ''}"><span>${esc(b.data)}</span>${chip(b.hash, 5)}</div>`
    }).join('')
    const more = Array.from({ length: opts.extra ?? 0 }, () => '<span class="gs-link">→</span><div class="gs-mb new"><span>new block</span></div>').join('')
    return `<div class="gs-mrow ${opts.tone ?? ''}">${opts.label ? `<span class="lbl">${opts.label}</span>` : ''}<div class="gs-mchain">${blocks}${more}</div></div>`
  }

  function draw() {
    if (!st.orig.length) { paint(box, '<p class="lnote">Building the chain…</p>'); return }
    const k = st.active
    if (k === 0) {
      const broken = st.p1.some((b, i) => i && b.prev !== st.p1[i - 1].hash)
      paint(box, mini(st.p1, { label: 'A plain hash chain' })
        + `<p class="gs-big">${broken ? '<b class="bad">Broken links</b> after the edit' : st.p1Hashes ? `<b class="ok">All links fit</b> rebuilt with just ${st.p1Hashes} hashes` : '<b class="ok">All links fit</b>'}</p>`)
    }
    if (k === 1) {
      paint(box, mini(st.orig, { label: 'Branch 1', record: st.record, tone: st.record ? 'good' : '' }) + mini(st.fake, { label: 'Branch 2', record: st.record })
        + `<p class="gs-big">${st.record ? '<b class="ok">Branch 1</b> matches your saved fingerprints' : '<b>?</b> Both look tidy. Which one is real?'}</p>`)
    }
    if (k === 2) {
      const r = st.race
      const left = `<div class="gs-side"><span class="lbl">Plain chain</span>${mini(r ? st.fake : st.orig)}${r ? '<p class="gs-big"><b class="bad">Rewritten</b></p><p class="lnote">3 hashes · done in a blink</p>' : '<p class="lnote">Each block: just one hash</p>'}</div>`
      const bar = (n: number, of: number, cls: string) => `<span class="gs-meter ${cls}"><i style="width:${Math.min(100, (n / of) * 100)}%"></i></span>`
      const right = `<div class="gs-side"><span class="lbl">With proof of work</span>`
        + (r ? `<p class="lnote">Attacker's chain: <b>${r.mined}</b> blocks re-mined · ${r.guesses.toLocaleString()} guesses</p>${bar(r.mined, 3 + r.honest, 'bad')}`
          + `<p class="lnote">Honest miners: <b>${3 + r.honest}</b> blocks and counting</p>${bar(3 + r.honest, 3 + r.honest, 'ok')}`
          + (r.done ? `<p class="gs-big"><b class="ok">Still behind</b> by ${3 + r.honest - r.mined}</p>` : '<p class="lnote">Mining…</p>')
          : `${mini(st.orig)}<p class="lnote">Each block: ⛏ about 4,000 guesses</p>`) + '</div>'
      paint(box, `<div class="gs-sides">${left}${right}</div>`)
    }
    if (k === 3) {
      const s = st.sent
      const nodes = ['Node 1', 'Node 2', 'Node 3'].map((n, i) => {
        const done = s && i < s.checked
        return `<div class="gs-node${done ? (s!.good ? ' ok' : ' bad') : ''}"><b>${n}</b><span>${done ? (s!.good ? '✓ Accepted' : '✗ Rejected') : 'waiting'}</span></div>`
      }).join('')
      const blk = s ? `<div class="gs-mb big${s.good ? '' : ' bad'}"><span>Alice pays Bob 50</span><span class="lbl">signature</span><b class="${s.good ? 'ok' : 'bad'}">${s.good ? '✓ Alice’s' : '✗ fake'}</b><span class="lbl">work</span><b>⛏ ${s.good ? '1,024' : '1,000,000'} guesses</b></div>` : '<p class="lnote">Send a block to the nodes.</p>'
      paint(box, `<div class="gs-check">${blk}<div class="gs-nodes">${nodes}</div></div>`)
    }
    if (k >= 4) {
      paint(box, '<div class="gs-jobs"><div class="gs-job"><span class="gs-ico">🔍</span><b>Hashes and links</b><span>show that history was changed</span></div>'
        + '<div class="gs-job"><span class="gs-ico">⛏</span><b>Proof of work</b><span>makes changing history expensive</span></div></div>'
        + '<p class="gs-big"><b class="ok">Two jobs</b> and a blockchain needs both</p>')
    }
  }

  ;(async () => {
    const orig = await chainOf(CHAIN_DATA)
    const fake = await chainOf([FAKE, ...CHAIN_DATA.slice(1)])
    if (!lf.alive()) return
    st.orig = orig; st.fake = fake; st.p1 = orig
    draw()
  })()

  return {
    show(k) { st.active = k; draw() },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="edit">Change block 1</button><button class="btn sm gold" data-a="fix" disabled>Recompute every hash</button><button class="btn sm" data-a="reset">Reset</button>')
        t.q('edit').onclick = async () => {
          st.p1 = await chainOf([FAKE, ...CHAIN_DATA.slice(1)], st.orig); st.p1Hashes = 0
          t.q('fix').disabled = false
          t.msg('bad', 'The links after block 1 broke. Now play the attacker: recompute them.')
          draw()
        }
        t.q('fix').onclick = async () => {
          st.p1 = await chainOf(st.p1.map((b) => b.data)); st.p1Hashes = 3
          t.q('fix').disabled = true
          t.msg('bad', 'Done in a blink. Every link fits again, so the fake chain looks perfectly consistent.')
          draw()
        }
        t.q('reset').onclick = () => { st.p1 = st.orig; st.p1Hashes = 0; t.q('fix').disabled = true; t.msg('', ''); draw() }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="rec">I kept the original fingerprints</button>')
        t.q('rec').onclick = () => {
          st.record = !st.record
          t.q('rec').textContent = st.record ? "I'm new here, I have nothing saved" : 'I kept the original fingerprints'
          t.msg(st.record ? 'ok' : '', st.record ? 'With the saved fingerprints you can spot branch 2 as the rewrite.' : 'A newcomer sees two chains whose links all fit. Nothing says which one to trust.')
          draw()
        }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="go">Rewrite block 1 in both</button>')
        t.q('go').onclick = async () => {
          const go = lf.run()
          t.q('go').disabled = true
          st.race = { mined: 0, guesses: 0, honest: 0, done: false }
          t.msg('', 'The plain chain is rewritten already. The proof-of-work chain has to be mined again, block by block…')
          draw()
          // the attacker has a bit over half the honest miners' speed; each tick, either side may find a block
          for (let tick = 0; tick < 70 && st.race.mined < 3 + st.race.honest; tick++) {
            await new Promise((r) => setTimeout(r, ctx.motion ? 110 : 10))
            if (!go()) return
            st.race.guesses += 900 + Math.floor(Math.random() * 300)
            if (Math.random() < 0.09) st.race.mined++
            if (Math.random() < 0.15) st.race.honest++
            if (st.active === 2) draw()
          }
          st.race.done = true
          t.q('go').disabled = false; t.q('go').textContent = 'Try again'
          const ahead = st.race.mined >= 3 + st.race.honest
          t.msg(ahead ? 'bad' : 'ok', ahead ? 'Lucky this time! But it took lots of work, and luck like that is rare.' : 'While the attacker redid the old blocks, honest miners kept adding new ones. A moving target!')
          if (st.active === 2) draw()
        }
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm danger" data-a="bad">Send a block with a fake signature and loads of work</button><button class="btn sm gold" data-a="good">Send a valid block</button>')
        const send = async (good: boolean) => {
          const go = lf.run()
          st.sent = { good, checked: 0 }
          for (let i = 1; i <= 3; i++) { await lf.wait(450); if (!go()) return; st.sent.checked = i; if (st.active === 3) draw() }
          t.msg(good ? 'ok' : 'bad', good ? 'Valid signature and valid work: every node accepts it.' : 'Rejected by every node. All that work can’t make a fake signature real.')
        }
        t.q('bad').onclick = () => send(false)
        t.q('good').onclick = () => send(true)
      }
    },
    caption: (k) => at([
      'Edit an old block, then rebuild the hashes. Easy!',
      'Two branches, both perfectly linked.',
      'Cheap to rewrite on the left, costly on the right.',
      'Work never makes a broken rule OK.',
      'Spot changes, and make them expensive.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default rewrite
