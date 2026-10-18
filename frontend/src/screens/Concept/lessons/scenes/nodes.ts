/**
 * Nodes: six computers on a network map, each keeping and checking its own copy. Blocks hop from node to node.
 * Parts: a block spreads and every node checks it · miners vs nodes · a fake-signature block stops at the first check ·
 * slow links and two blocks at once make nodes disagree for a while · nodes check instead of trusting a miner.
 */
import { at, life, tryBox, type SceneMaker } from './kit'

// name, x %, y %, mines?
const NODES: [string, number, number, boolean][] = [
  ['Alice', 16, 24, false], ['Bob', 50, 13, true], ['Charlie', 84, 24, false],
  ['Dana', 84, 62, false], ['Eli', 50, 71, true], ['Fay', 16, 62, false],
]
const EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4], [0, 3]]
const SLOW = new Set(['2-3', '3-4', '0-3']) // slow links to Dana in part 4
const COLORS = { a: 'var(--mint)', b: 'var(--sky)', x: 'var(--coral)' }

type Status = '' | 'chk' | 'ok' | 'bad'

const nodes: SceneMaker = (stage, ctx) => {
  stage.innerHTML = `<div class="gs gs-net"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${EDGES.map(([a, b]) => `<line data-e="${a}-${b}" x1="${NODES[a][1]}" y1="${NODES[a][2]}" x2="${NODES[b][1]}" y2="${NODES[b][2]}"/>`).join('')}</svg>`
    + NODES.map(([n, x, y, mines], i) => `<div class="gs-nn${mines ? ' miner' : ''}" data-i="${i}" style="left:${x}%;top:${y}%"><div class="av">${n[0]}</div><span class="gs-nn-n">${n}${mines ? ' ⛏' : ''}</span><span class="gs-nn-tip"></span><em class="gs-nn-st"></em></div>`).join('')
    + '<p class="gs-net-note lnote"></p></div>'
  const root = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const el = (i: number) => root.querySelector(`[data-i="${i}"]`) as HTMLElement
  const st = {
    active: 0,
    height: NODES.map(() => 5),
    tip: NODES.map(() => '' as '' | 'a' | 'b'),
    status: NODES.map(() => '' as Status),
    showMiners: false,
  }
  const note = (t: string) => ((root.querySelector('.gs-net-note') as HTMLElement).textContent = t)

  function draw() {
    NODES.forEach((_, i) => {
      const e = el(i)
      e.className = `gs-nn${NODES[i][3] ? ' miner' : ''}${st.showMiners && st.active === 1 ? (NODES[i][3] ? ' glow' : ' dim') : ''} ${st.status[i]}`
      const tip = e.querySelector('.gs-nn-tip') as HTMLElement
      tip.textContent = `${st.height[i]} blocks`
      tip.style.color = st.tip[i] ? COLORS[st.tip[i] as 'a' | 'b'] : ''
      ;(e.querySelector('.gs-nn-st') as HTMLElement).textContent = { '': '', chk: '🔍', ok: '✓', bad: '✗' }[st.status[i]]
    })
    const k = st.active
    const heights = new Set(st.height), tips = new Set(st.tip.filter(Boolean))
    note(k === 1 ? (st.showMiners ? '6 nodes, but only Bob and Eli mine. The others just check.' : 'Every circle is a node: a computer keeping its own copy.')
      : heights.size > 1 || tips.size > 1 ? 'The nodes disagree for now. Nobody is cheating: news takes time to travel.'
      : 'Every node holds its own copy of the chain.')
  }

  /** a dot travelling along an edge */
  function packet(from: number, to: number, ms: number, color: string) {
    const p = document.createElement('i')
    p.className = 'gs-pkt'
    p.style.background = color
    p.style.left = NODES[from][1] + '%'; p.style.top = NODES[from][2] + '%'
    p.style.transitionDuration = ms + 'ms'
    root.appendChild(p)
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.left = NODES[to][1] + '%'; p.style.top = NODES[to][2] + '%' }))
    setTimeout(() => p.remove(), ms + 60)
  }

  /**
   * A block spreads from `start`: each node that receives it checks it (a short pause), then accepts and passes it on,
   * or rejects it and stops it there. Nodes that already have a block this round ignore later ones (first seen wins).
   */
  async function spread(starts: [number, 'a' | 'b'][], opts: { fake?: boolean; slow?: boolean } = {}) {
    const go = lf.run()
    st.status = NODES.map(() => '')
    const got = NODES.map(() => false)
    const base = st.height[0]
    const delay = (a: number, b: number) => (opts.slow && (SLOW.has(`${a}-${b}`) || SLOW.has(`${b}-${a}`)) ? 2600 : 700)
    let pending = 0 // nodes still checking + messages still travelling
    const receive = async (i: number, from: number, tag: 'a' | 'b') => {
      if (got[i]) return
      got[i] = true
      pending++
      try {
        st.status[i] = 'chk'; draw()
        await lf.wait(450)
        if (!go()) return
        if (opts.fake) {
          // the sender just sends it; everyone else checks and throws it out
          st.status[i] = from >= 0 ? 'bad' : ''; draw()
          if (from >= 0) return
        } else { st.status[i] = 'ok'; st.height[i] = base + 1; st.tip[i] = starts.length > 1 ? tag : ''; draw() }
        for (const [a, b] of EDGES) {
          const j = a === i ? b : b === i ? a : -1
          if (j < 0 || got[j]) continue
          const ms = delay(i, j)
          pending++
          packet(i, j, ctx.motion ? ms : 0, opts.fake ? COLORS.x : COLORS[tag])
          setTimeout(() => { if (go()) receive(j, i, tag); pending-- }, ctx.motion ? ms : 30)
        }
      } finally { pending-- }
    }
    starts.forEach(([i, tag]) => receive(i, -1, tag))
    // wait until every node has checked the block and every message has arrived
    while (go()) { await lf.wait(200); if (pending === 0) break }
    return go()
  }

  draw()

  return {
    show(k) {
      lf.run()
      st.active = k
      st.status = NODES.map(() => '')
      const h = Math.max(...st.height); st.height = NODES.map(() => h); st.tip = NODES.map(() => '')
      draw()
    },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="go">Bob mines a block</button>')
        t.q('go').onclick = async () => {
          t.q('go').disabled = true
          if (await spread([[1, 'a']])) t.msg('ok', 'Every node checked the new block itself, then added it to its own copy.')
          t.q('go').disabled = false
        }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="m">Show who mines</button>')
        t.q('m').onclick = () => {
          st.showMiners = !st.showMiners
          t.q('m').textContent = st.showMiners ? 'Show all nodes' : 'Show who mines'
          t.msg('', st.showMiners ? 'Bob and Eli mine and check. Alice, Charlie, Dana and Fay only check. Counting computers is not the same as counting mining power.' : '')
          draw()
        }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="ok">Bob sends a valid block</button><button class="btn sm danger" data-a="bad">Bob sends a block with a fake signature</button>')
        const off = (v: boolean) => { t.q('ok').disabled = v; t.q('bad').disabled = v }
        t.q('ok').onclick = async () => { off(true); if (await spread([[1, 'a']])) t.msg('ok', 'Valid, so every node accepts it and passes it on.'); off(false) }
        t.q('bad').onclick = async () => {
          off(true)
          if (await spread([[1, 'a']], { fake: true })) {
            t.msg('bad', 'Rejected at the first check! It spends coins without a valid signature, so no node accepts it or passes it on, however much work went into it.')
          }
          off(false)
        }
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="slow">Send a block over slow links</button><button class="btn sm" data-a="two">Bob and Eli find blocks at once</button>')
        const off = (v: boolean) => { t.q('slow').disabled = v; t.q('two').disabled = v }
        t.q('slow').onclick = async () => {
          off(true); t.msg('', 'Watch Dana: her links are slow…')
          if (await spread([[1, 'a']], { slow: true })) t.msg('ok', 'For a moment Dana had an older tip than everyone else. Then the news arrived and they all agreed.')
          off(false)
        }
        t.q('two').onclick = async () => {
          off(true)
          if (await spread([[1, 'a'], [4, 'b']])) {
            const a = st.tip.filter((x) => x === 'a').length
            t.msg('', `${a} nodes saw Bob's block first (green), ${6 - a} saw Eli's (blue). Both are valid! The Forks moon shows how they settle it.`)
          }
          off(false)
        }
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="trust">Eli says: “Trust me, it’s fine!”</button>')
        t.q('trust').onclick = async () => {
          t.q('trust').disabled = true
          if (await spread([[4, 'a']])) t.msg('ok', "Nobody took Eli's word for it: every node ran the checks itself. It still relies on good software and a working network.")
          t.q('trust').disabled = false
        }
      }
    },
    caption: (k) => at([
      'Each node keeps its own copy and checks every block.',
      'Some nodes mine. All of them check.',
      'A bad block stops at the first node that checks it.',
      'News takes time, so tips can differ for a while.',
      'Check it yourself instead of trusting the sender.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default nodes
