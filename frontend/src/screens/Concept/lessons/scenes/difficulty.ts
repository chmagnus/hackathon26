/**
 * Difficulty and rewards: blocks appear on a live timeline. More guesses per second = blocks sooner;
 * a stricter target = blocks later; the network can re-tune the target to keep the pace. Then the miner's wallet.
 * Parts: more miners · the worked example (256 ÷ 256 = 1 s) · automatic adjustment · rewards and fees ·
 * a reward can't make a bad block good.
 */
import { at, life, markPick, paint, pickHTML, tryBox, type SceneMaker } from './kit'

const WINDOW = 12 // seconds of timeline shown
const PER_MINER = 64 // guesses per second each miner makes
const GOAL = 1 // seconds between blocks the network aims for (part 3)
const EVERY = 6 // blocks between adjustments (part 3)

const difficulty: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-diff"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    miners: [4, 4, 4], // per part: how many miners (64 guesses/s each)
    need: [256, 256, 256], // per part: about 1 in this many guesses works
    auto: true, // part 3: re-tune the target
    tunes: [256] as number[], // part 3: the target after each adjustment
    blocks: [] as number[], // when blocks were found (seconds)
    sinceTune: 0,
    wallet: 0, mined: [] as ('ok' | 'bad')[], // part 4
  }
  let timer: ReturnType<typeof setInterval> | undefined
  const now = () => performance.now() / 1000
  const rate = (k = st.active) => at(st.miners, k) * PER_MINER
  const need = (k = st.active) => at(st.need, k)

  /** one tick of the simulation: each guess has a 1 in `need` chance */
  function tick(dt: number) {
    const k = Math.min(st.active, 2)
    if (Math.random() < 1 - Math.exp((-dt * rate(k)) / need(k))) {
      st.blocks.push(now())
      st.blocks = st.blocks.slice(-30)
      if (k === 2 && st.auto && ++st.sinceTune >= EVERY) {
        st.sinceTune = 0
        const gaps = st.blocks.slice(-EVERY - 1)
        const avg = (gaps[gaps.length - 1] - gaps[0]) / (gaps.length - 1)
        // too fast: make it stricter; too slow: easier (at most 4× either way, like Bitcoin's limit)
        const next = Math.round(Math.min(4, Math.max(0.25, GOAL / avg)) * st.need[2])
        st.need[2] = Math.max(16, Math.min(65536, next))
        st.tunes = [...st.tunes, st.need[2]].slice(-8)
      }
    }
    draw()
  }
  function run(on: boolean) {
    clearInterval(timer); timer = undefined
    if (on && lf.alive()) { let last = now(); timer = setInterval(() => { const t = now(); tick(t - last); last = t }, 100) }
  }
  const avgGap = () => {
    const b = st.blocks.slice(-8)
    return b.length > 2 ? (b[b.length - 1] - b[0]) / (b.length - 1) : null
  }
  const secs = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + ' s'

  function draw() {
    const k = st.active
    if (k <= 2) {
      const t = now(), expect = need() / rate(), avg = avgGap()
      const marks = st.blocks.filter((b) => t - b < WINDOW).map((b) => `<i class="gs-blip${t - b < 0.5 ? ' new' : ''}" style="left:${100 - ((t - b) / WINDOW) * 100}%"></i>`).join('')
      const tunes = k === 2 ? `<div class="gs-tunes"><span class="lbl">Target after each check (1 in …)</span><div class="gs-bars">${st.tunes.map((n, i) => `<span class="${i === st.tunes.length - 1 ? 'on' : ''}" style="height:${Math.min(100, 14 + Math.log2(n / 16) * 9)}%"><em>${n >= 10000 ? Math.round(n / 1000) + 'k' : n}</em></span>`).join('')}</div></div>` : ''
      paint(box, `<div class="gs-stats"><div><span class="lbl">Guesses / second</span><b>${rate().toLocaleString()}</b><span>${at(st.miners, k)} miner${at(st.miners, k) > 1 ? 's' : ''}</span></div>`
        + `<div><span class="lbl">Target</span><b>1 in ${need().toLocaleString()}</b><span>guesses works</span></div>`
        + `<div><span class="lbl">Expected wait</span><b class="ok">${secs(expect)}</b><span>${avg ? `measured ${secs(avg)}` : 'measuring…'}</span></div></div>`
        + `<div class="gs-track"><span class="lbl">Blocks found (last ${WINDOW} s)</span><div class="gs-line">${marks}<span class="gs-now">now</span></div></div>`
        + (k === 1 ? `<p class="gs-big"><b>${need().toLocaleString()}</b> ÷ <b>${rate().toLocaleString()}</b> per second ≈ <b class="ok">${secs(expect)}</b></p>` : '')
        + tunes)
      return
    }
    if (k === 3) {
      const log = st.mined.slice(-5).map((m) => `<span class="${m}">${m === 'ok' ? '+12' : '+0'}</span>`).join('')
      paint(box, `<div class="gs-wallet"><span class="gs-ico">⛏</span><div><span class="lbl">Gold miner's wallet</span><b class="gs-coins">${st.wallet}</b><span>coins</span></div></div>`
        + `<div class="gs-log">${log || '<span class="lnote">No blocks yet</span>'}</div>`
        + '<p class="lnote">A valid block earns 10 new coins + 2 coins of fees. A rejected one earns nothing.</p>')
      return
    }
    paint(box, '<div class="gs-jobs"><div class="gs-job ok"><span class="gs-ico">✓</span><b>Valid block</b><span>nodes accept it, so its reward counts</span></div>'
      + '<div class="gs-job bad"><span class="gs-ico">✗</span><b>Invalid block</b><span>no reward can make it valid</span></div></div>'
      + '<p class="gs-big">Nodes check every block <b class="ok">themselves</b></p>')
  }

  return {
    show(k) {
      if (k !== st.active) { st.blocks = []; st.sinceTune = 0 }
      st.active = k
      run(k <= 2)
      draw()
    },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<span class="down">Miners:</span>' + pickHTML('m', [1, 2, 4, 8], st.miners[0]))
        t.all('[data-m]').forEach((b) => (b.onclick = () => {
          st.miners[0] = +b.dataset.m!; markPick(host, 'm', st.miners[0]); st.blocks = []
          t.msg('', `${rate(0)} guesses a second at 1 in 256: a block about every ${secs(256 / rate(0))} on average. More guesses, more frequent blocks.`)
          draw()
        }))
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="dbl">Double the hash rate</button>')
        t.q('dbl').onclick = () => {
          st.miners[1] = st.miners[1] === 4 ? 8 : 4; st.blocks = []
          t.q('dbl').textContent = st.miners[1] === 4 ? 'Double the hash rate' : 'Back to 256 a second'
          t.msg('', st.miners[1] === 8 ? 'Twice the guesses: the average wait roughly halves, to about 0.5 s. Each single wait is still a surprise.' : '256 guesses a second at 1 in 256: about 1 second per block.')
          draw()
        }
      }
      if (k === 2) {
        const t = tryBox(host, '<button class="btn sm" data-a="more">More miners</button><button class="btn sm" data-a="less">Fewer miners</button><button class="btn sm on" data-a="auto">Auto-adjust: on</button>')
        const set = (m: number) => {
          st.miners[2] = Math.max(1, Math.min(32, m))
          t.msg('', st.auto ? `${st.miners[2]} miners now. Watch the target: every ${EVERY} blocks the network re-tunes it to bring the pace back to about ${GOAL} s.` : `${st.miners[2]} miners, and nobody re-tunes the target, so the pace drifts.`)
          draw()
        }
        t.q('more').onclick = () => set(st.miners[2] * 2)
        t.q('less').onclick = () => set(st.miners[2] / 2)
        t.q('auto').onclick = () => {
          st.auto = !st.auto
          t.q('auto').textContent = `Auto-adjust: ${st.auto ? 'on' : 'off'}`
          t.q('auto').classList.toggle('on', st.auto)
          t.msg('', st.auto ? 'Auto-adjust is on. (Bitcoin re-tunes every 2016 blocks, aiming for 10 minutes. Other chains use other rules.)' : 'Auto-adjust is off: more miners just means faster blocks.')
        }
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="ok">Mine a valid block</button><button class="btn sm danger" data-a="bad">Mine a block that breaks the rules</button>')
        t.q('ok').onclick = () => {
          st.wallet += 12; st.mined.push('ok'); draw()
          t.msg('ok', 'Accepted! 10 brand-new coins plus 2 coins of fees from the payments inside.')
        }
        t.q('bad').onclick = () => {
          st.mined.push('bad'); draw()
          t.msg('bad', 'Rejected by the other nodes. In the accepted history this block never happened, so its reward is worth nothing.')
        }
      }
    },
    caption: (k) => at([
      'Each dot is a block. More miners, more dots.',
      'Average wait = guesses needed ÷ guesses per second.',
      'The network nudges the target to keep a steady pace.',
      'The reward pays miners to follow the rules.',
      'A reward never makes a bad block good.',
    ], k),
    stop() { run(false); lf.stop() },
  }
}

export default difficulty
