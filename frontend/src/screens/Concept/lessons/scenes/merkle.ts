/**
 * Merkle trees: four transactions hashed in pairs up to one root.
 * Parts: build the tree level by level · an edit turns its path to the root red · B's proof checked step by step ·
 * how small a proof stays as the tree grows · swapping two transactions changes the root.
 */
import { at, chip, esc, life, paint, sha256, tryBox, type SceneMaker } from './kit'

const TXS = ['Alice pays Bob 3', 'Bob pays Charlie 1', 'Charlie pays Dan 2', 'Dan pays Alice 4']
const LEAVES = ['A', 'B', 'C', 'D']
// key, label, x %, y %, parent
const NODES: [string, string, number, number, string][] = [
  ['root', 'Root', 50, 11, ''], ['P', 'P', 25, 36, 'root'], ['Q', 'Q', 75, 36, 'root'],
  ...LEAVES.map((k, i): [string, string, number, number, string] => [k, `H(${k})`, 12.5 + i * 25, 61, i < 2 ? 'P' : 'Q']),
]
const SIZES = [4, 8, 16, 64, 1024, 1048576]

type Tree = Record<string, string>
async function build(txs: string[]): Promise<Tree> {
  const [A, B, C, D] = await Promise.all(txs.map((t) => sha256(t)))
  const [P, Q] = await Promise.all([sha256(A + B), sha256(C + D)])
  return { A, B, C, D, P, Q, root: await sha256(P + Q) }
}

const merkle: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-merkle"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    txs: [0, 1, 2, 3, 4].map(() => [...TXS]), // each part's transactions
    orig: null as Tree | null,
    tree: null as Tree | null,
    built: 3, // part 1: levels shown so far (0 = only the transactions)
    look: {} as Record<string, string>, // part 3: proof step highlights
    size: 2, // part 4: index into SIZES
  }
  const txs = () => at(st.txs, st.active)

  async function update() {
    const go = lf.run()
    const t = await build(txs())
    if (!go()) return
    st.orig ??= t
    st.tree = t
    draw()
  }

  function treeHTML() {
    const t = st.tree!, o = st.orig!, k = st.active
    const level = (key: string) => (key === 'root' ? 3 : key === 'P' || key === 'Q' ? 2 : 1)
    const look = (key: string) => {
      if (k === 0 && level(key) > st.built) return 'off'
      if (k === 2 && st.look[key]) return st.look[key]
      return t[key] !== o[key] ? 'ch' : ''
    }
    const lines = NODES.filter((n) => n[4]).map(([key, , x, y, p]) => {
      const parent = NODES.find((n) => n[0] === p)!
      return `<line class="${look(key) === 'off' || look(p) === 'off' ? 'off' : look(key) === 'ch' && look(p) === 'ch' ? 'ch' : ''}" x1="${x}" y1="${y}" x2="${parent[2]}" y2="${parent[3]}"/>`
    }).join('') + LEAVES.map((key, i) => `<line class="${look(key) === 'off' ? 'off' : ''}" x1="${12.5 + i * 25}" y1="86" x2="${12.5 + i * 25}" y2="61"/>`).join('')
    const nodes = NODES.map(([key, label, x, y]) => `<div class="gs-nd ${look(key)}" style="left:${x}%;top:${y}%"><b>${label}</b>${look(key) === 'off' ? '<span class="gs-q">?</span>' : chip(t[key], 6)}</div>`).join('')
    const leaves = txs().map((tx, i) => `<div class="gs-leaf${tx !== TXS[i] ? ' ch' : ''}" style="left:${12.5 + i * 25}%"><b>${LEAVES[i]}</b>${esc(tx) || '…'}</div>`).join('')
    return `<div class="gs-tree"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes}${leaves}</div>`
  }

  function sizeHTML() {
    const n = SIZES[st.size], levels = Math.log2(n)
    const rows = Math.min(levels, 6)
    const bars = Array.from({ length: rows }, (_, r) => {
      // one transaction's path up the tree (mint) and the sibling hash the proof needs on each level (gold)
      const count = 2 ** (r + 1), p = Math.floor(0.62 * count)
      const dots = count <= 16 ? Array.from({ length: count }, (_, i) => `<i class="${i === p ? 'pt' : i === (p ^ 1) ? 'pf' : ''}"></i>`).join('') : '<span>…</span><i class="pf"></i><i class="pt"></i><span>…</span>'
      return `<div class="gs-lvl">${dots}</div>`
    }).join('')
    return `<div class="gs-size"><div class="gs-lvls"><div class="gs-lvl"><i class="root"></i></div>${bars}${levels > rows ? '<div class="gs-lvl"><span>… more levels …</span></div>' : ''}</div>`
      + `<p class="gs-big"><b>${n.toLocaleString()}</b> transactions → proof of just <b class="ok">${levels}</b> hashes</p>`
      + '<p class="lnote">A proof still doesn’t show the payment was allowed, or that its block is on the accepted chain.</p></div>'
  }

  function draw() {
    if (!st.tree || !st.orig) { paint(box, '<p class="lnote">Hashing…</p>'); return }
    if (st.active === 3) { paint(box, sizeHTML()); return }
    const t = st.tree, o = st.orig
    const note = st.active === 4 && t.root !== o.root ? '<p class="gs-big"><b class="bad">New root</b> same transactions, new order</p>'
      : st.active === 0 ? `<p class="gs-big">${st.built >= 3 ? '<b class="ok">One root</b> sums up all four' : 'Building…'}</p>` : ''
    paint(box, treeHTML() + note)
  }

  update()

  return {
    show(k) { st.active = k; if (k !== 0) st.built = 3; if (k !== 2) st.look = {}; update() },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="build">Build the tree</button>')
        t.q('build').onclick = async () => {
          const go = lf.run()
          t.q('build').disabled = true
          const steps = ['Hash each transaction: H(A), H(B), H(C), H(D).', 'Pair them up: P = H(H(A) + H(B)), Q = H(H(C) + H(D)).', 'Pair again: the root = H(P + Q).']
          for (st.built = 0; st.built <= 3; st.built++) {
            draw()
            if (st.built) t.msg('', steps[st.built - 1])
            await lf.wait(900)
            if (!go()) break
          }
          st.built = 3; draw()
          t.q('build').disabled = false
          t.msg('ok', 'Done! That one root commits to all four transactions, in this order.')
        }
      }
      if (k === 1) {
        const t = tryBox(host, `<select data-a="pick" aria-label="Transaction to edit">${LEAVES.map((l, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${l}</option>`).join('')}</select><input type="text" class="txt" data-a="in" aria-label="Transaction" value="${esc(TXS[2])}"><button class="btn sm" data-a="reset">Reset</button>`)
        const pick = t.q<HTMLSelectElement>('pick'), inp = t.q<HTMLInputElement>('in'), mine = st.txs[1]
        const report = () => {
          update()
          const i = mine.findIndex((x, j) => x !== TXS[j])
          if (i < 0) { t.msg('', ''); return }
          const [up, other] = i < 2 ? ['P', 'Q'] : ['Q', 'P']
          t.msg('bad', `${LEAVES[i]} changed, so H(${LEAVES[i]}), ${up} and the root changed. ${other} stayed the same.`)
        }
        pick.onchange = () => { mine.splice(0, 4, ...TXS); inp.value = TXS[+pick.value]; report() }
        inp.oninput = () => { mine[+pick.value] = inp.value; report() }
        t.q('reset').onclick = () => { mine.splice(0, 4, ...TXS); inp.value = TXS[+pick.value]; report() }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="check">Check B’s proof</button><button class="btn sm danger" data-a="fake">Try it with a fake B</button>')
        const mine = st.txs[2]
        const run = async (fake: boolean) => {
          const go = lf.run()
          mine[1] = fake ? 'Bob pays Charlie 100' : TXS[1]
          const tr = await build(mine)
          if (!go()) return
          st.tree = tr; st.look = {}
          const steps: [Record<string, string>, string][] = [
            [{ B: 'pt' }, 'Step 1: hash B.'],
            [{ B: 'pt', A: 'pf', P: 'pt' }, 'Step 2: join it with H(A) from the proof to get P.'],
            [{ B: 'pt', A: 'pf', P: 'pt', Q: 'pf', root: 'pt' }, 'Step 3: join P with Q from the proof to get a root.'],
          ]
          for (const [look, text] of steps) {
            st.look = look; draw(); t.msg('', text)
            await lf.wait(1000)
            if (!go()) return
          }
          const ok = tr.root === st.orig!.root
          st.look = { ...st.look, root: ok ? 'pt' : 'ch' }; draw()
          t.msg(ok ? 'ok' : 'bad', ok ? 'It matches the trusted root, so B is in the tree. Only two hashes were needed: H(A) and Q.' : "The root doesn't match the trusted one. This fake B isn't in the tree.")
        }
        t.q('check').onclick = () => run(false)
        t.q('fake').onclick = () => run(true)
      }
      if (k === 3) {
        const t = tryBox(host, `<span class="down">Transactions:</span><input type="range" data-a="n" min="0" max="${SIZES.length - 1}" value="${st.size}" aria-label="Number of transactions"><b data-a="nv">${SIZES[st.size].toLocaleString()}</b>`)
        t.q<HTMLInputElement>('n').oninput = (e) => {
          st.size = +(e.target as HTMLInputElement).value
          t.q<HTMLElement>('nv').textContent = SIZES[st.size].toLocaleString()
          t.msg('', `Double the transactions and the proof grows by just one hash: ${Math.log2(SIZES[st.size])} hashes for ${SIZES[st.size].toLocaleString()}.`)
          draw()
        }
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="swap">Swap A and B</button>')
        const mine = st.txs[4]
        t.q('swap').onclick = () => {
          mine.splice(0, 2, mine[1], mine[0])
          const swapped = mine[0] !== TXS[0]
          t.q('swap').textContent = swapped ? 'Put them back' : 'Swap A and B'
          t.msg(swapped ? 'bad' : 'ok', swapped ? 'Same four transactions, different order, different root. Everyone must agree on the order.' : 'Back in order: the original root.')
          update()
        }
      }
    },
    caption: (k) => at([
      'Hash the transactions, then hash pairs, up to one root.',
      'An edit only changes its own path to the root.',
      'Gold: the hashes the proof gives you.',
      'The proof grows by one hash each time the tree doubles.',
      'Order matters: swap two leaves and the root changes.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default merkle
