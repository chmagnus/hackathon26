/**
 * Proof of stake: four validators around a table, each with a pile of locked-up coins (stake).
 * Parts: stake instead of computing power · one proposes, the others vote (2/3 of the stake agrees) ·
 * rewards, slashing and downtime · slow votes and too much stake in one place · the whole Blockchain planet, recapped.
 */
import { at, esc, life, paint, tryBox, type SceneMaker } from './kit'
import { PCOL } from '../storyKit'

const WHO = ['Alice', 'Bob', 'Charlie', 'Dana'] as const
type Who = (typeof WHO)[number]
const COL: Record<Who, string> = { ...PCOL, Dana: '#b69cff' }
const START: Record<Who, number> = { Alice: 40, Bob: 30, Charlie: 20, Dana: 10 }
const RECAP = ['Ledger', 'Hashes', 'Signatures', 'Block links', 'Consensus']

const stake: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-stake"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    stake: { ...START },
    proposer: null as Who | null,
    votes: [] as Who[], // who has voted so far
    burnt: null as Who | null, offline: null as Who | null,
    lit: RECAP.length, // part 5: recap badges lit so far
  }
  const total = () => WHO.reduce((s, n) => s + st.stake[n], 0)
  const share = (n: Who) => Math.round((st.stake[n] / total()) * 100)
  const voted = () => st.votes.reduce((s, n) => s + st.stake[n], 0) / total()

  const seat = (n: Who) => {
    const v = st.votes.includes(n)
    return `<div class="gs-val${st.proposer === n ? ' prop' : ''}${st.burnt === n ? ' burnt' : ''}${st.offline === n ? ' off' : ''}" style="--c:${COL[n]}">`
      + `<div class="av">${n[0]}</div><b>${n}</b><span class="gs-pile"><i style="height:${Math.min(100, (st.stake[n] / 70) * 100)}%"></i></span>`
      + `<span class="gs-sh">${st.stake[n]} coins · ${share(n)}%</span><em>${st.burnt === n ? '🔥 slashed' : st.offline === n ? '💤 offline' : v ? '✓ voted' : st.proposer === n ? '📦 proposes' : ''}</em></div>`
  }
  const meter = () => {
    const v = voted()
    return `<div class="gs-vote"><span class="lbl">Stake that voted yes</span><span class="gs-meter ${v >= 2 / 3 ? 'ok' : 'gold'}"><i style="width:${v * 100}%"></i><b style="left:66.7%"></b></span>`
      + `<span>${Math.round(v * 100)}% ${v >= 2 / 3 ? '<b class="ok">✓ agreed</b>' : st.votes.length ? '<span class="down">needs 2/3</span>' : ''}</span></div>`
  }

  function draw() {
    const k = st.active
    if (k === 0) {
      paint(box, `<div class="gs-vs"><div><span class="gs-ico">⛏</span><b>Proof of work</b><span>computers race, using electricity</span></div><div class="on"><span class="gs-ico">🔒</span><b>Proof of stake</b><span>validators lock up coins</span></div></div><div class="gs-table">${WHO.map(seat).join('')}</div>`)
      return
    }
    if (k >= 4) {
      paint(box, `<div class="gs-recap">${RECAP.map((r, i) => `${i ? '<span class="gs-link">→</span>' : ''}<span class="gs-badge${i < st.lit ? ' on' : ''}">${esc(r)}</span>`).join('')}</div>`
        + '<p class="gs-big">A blockchain is <b class="ok">all of these</b> working together</p><p class="lnote">Not a promise that data is true, or that it can never change.</p>')
      return
    }
    paint(box, `<div class="gs-table">${WHO.map(seat).join('')}</div>${k >= 1 ? meter() : ''}`)
  }

  /** spin through the validators, then land on one picked with odds that follow the stake */
  async function pick(go: () => boolean) {
    for (let i = 0; i < 8; i++) {
      st.proposer = WHO[i % WHO.length]; draw()
      await lf.wait(90 + i * 15)
      if (!go()) return null
    }
    let r = Math.random() * total()
    let n: Who = WHO[WHO.length - 1]
    for (const w of WHO) { r -= st.stake[w]; if (r < 0) { n = w; break } }
    st.proposer = n; draw()
    return n
  }
  /** the others check the proposal and vote one by one; `late` votes arrive much later */
  async function vote(go: () => boolean, late: Who[] = []) {
    const order = WHO.filter((n) => n !== st.burnt && n !== st.offline)
    for (const n of order.filter((x) => !late.includes(x))) {
      await lf.wait(350); if (!go()) return false
      st.votes = [...st.votes, n]; draw()
    }
    if (late.length) {
      await lf.wait(1800); if (!go()) return false
      for (const n of late) { st.votes = [...st.votes, n]; draw(); await lf.wait(350) }
    }
    return go()
  }
  const fresh = () => { st.proposer = null; st.votes = [] }

  return {
    show(k) {
      lf.run()
      st.active = k; fresh()
      if (k >= 4) {
        const go = lf.run()
        ;(async () => { for (st.lit = 0; st.lit <= RECAP.length; st.lit++) { draw(); await lf.wait(350); if (!go()) return } st.lit = RECAP.length })()
      }
      draw()
    },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="more">Charlie locks up 20 more coins</button><button class="btn sm" data-a="reset">Reset</button>')
        t.q('more').onclick = () => {
          if (st.stake.Charlie >= 60) { t.msg('', 'Charlie has locked up plenty for now.'); return }
          st.stake.Charlie += 20; draw()
          t.msg('', `Charlie now has ${share('Charlie')}% of all the stake, so a bigger say in what gets agreed.`)
        }
        t.q('reset').onclick = () => { st.stake = { ...START }; draw(); t.msg('', '') }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="go">Pick a proposer, then vote</button>')
        t.q('go').onclick = async () => {
          const go = lf.run()
          t.q('go').disabled = true; fresh()
          const n = await pick(go)
          if (n) { t.msg('', `${n} proposes the next block (picked with ${share(n)}% odds). Now the others check it and vote…`); st.votes = [n] }
          if (n && (await vote(go))) t.msg('ok', 'Over 2/3 of the stake voted yes, so the block is agreed. Proposing and agreeing are separate jobs.')
          t.q('go').disabled = false
        }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="ok">Everyone votes honestly</button>'
          + `<select data-a="who" aria-label="Who cheats">${WHO.map((n) => `<option${n === 'Bob' ? ' selected' : ''}>${n}</option>`).join('')}</select>`
          + '<button class="btn sm danger" data-a="cheat">Votes for two blocks at once</button><button class="btn sm" data-a="off">Goes offline</button><button class="btn sm" data-a="reset">Reset</button>')
        const who = () => t.q<HTMLSelectElement>('who').value as Who
        t.q('ok').onclick = () => {
          WHO.forEach((n) => { if (n !== st.burnt && n !== st.offline) st.stake[n] += 1 })
          st.votes = WHO.filter((n) => n !== st.burnt && n !== st.offline); draw()
          t.msg('ok', 'Each validator who took part earns a small reward (+1 coin).')
        }
        t.q('cheat').onclick = () => {
          const n = who()
          fresh(); st.offline = st.offline === n ? null : st.offline
          st.stake[n] = Math.floor(st.stake[n] / 2); st.burnt = n; draw()
          t.msg('bad', `${n} voted for two different blocks. Anyone can prove it, so half of ${n}'s stake is destroyed (slashed).`)
        }
        t.q('off').onclick = () => {
          const n = who()
          if (st.burnt === n) { t.msg('', `${n} was already slashed. Pick someone else.`); return }
          fresh(); st.stake[n] = Math.max(0, st.stake[n] - 1); st.offline = n; draw()
          t.msg('', `${n} missed some votes: a small penalty (−1 coin), much milder than slashing. Each protocol sets its own rules.`)
        }
        t.q('reset').onclick = () => { st.stake = { ...START }; st.burnt = null; st.offline = null; fresh(); draw(); t.msg('', '') }
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="slow">Vote over a slow network</button><button class="btn sm danger" data-a="big">Dana buys most of the stake</button><button class="btn sm" data-a="reset">Reset</button>')
        t.q('slow').onclick = async () => {
          const go = lf.run()
          t.q('slow').disabled = true; fresh(); st.proposer = 'Bob'; st.votes = ['Bob']
          t.msg('', "Alice's and Charlie's votes are stuck on a slow link. The vote can't finish yet…")
          if (await vote(go, ['Alice', 'Charlie'])) t.msg('ok', 'The late votes arrived and the block was agreed. Delays slow things down here too.')
          t.q('slow').disabled = false
        }
        t.q('big').onclick = () => {
          st.stake = { Alice: 10, Bob: 10, Charlie: 10, Dana: 70 }; fresh(); draw()
          t.msg('bad', 'Dana now has 70% of the stake: more than 2/3 alone. She could agree on blocks by herself, or block everyone else. Too much stake in one place is a risk.')
        }
        t.q('reset').onclick = () => { st.stake = { ...START }; fresh(); draw(); t.msg('', '') }
      }
    },
    caption: (k) => at([
      'Stake replaces computing power.',
      'One validator proposes. The others check and vote.',
      'Honest work earns a little. Provable cheating burns stake.',
      'Delays and big stakeholders matter here too.',
      'Everything on this planet, working together.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default stake
