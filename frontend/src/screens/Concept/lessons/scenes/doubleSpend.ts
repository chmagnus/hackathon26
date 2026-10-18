/**
 * Double spending: Alice buys a bike from Bob's shop, then tries to undo the payment with a secret, longer chain.
 * Parts: two signed payments of the same coins · the reorganisation that makes Bob's payment vanish ·
 * the chance to catch up vs share of mining power (no magic 51% switch) · what mining power can't do ·
 * confirmations: safer, but slower.
 */
import { at, life, markPick, paint, pickHTML, tryBox, type SceneMaker } from './kit'

const Q = 0.25 // part 5: the attacker's share of mining power
const chance = (q: number, z: number) => (q >= 0.5 ? 1 : Math.pow(q / (1 - q), z))
const pctText = (v: number) => (v >= 0.995 ? '100%' : v >= 0.1 ? Math.round(v * 100) + '%' : v >= 0.001 ? (v * 100).toFixed(1) + '%' : '< 0.1%')

const doubleSpend: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-ds"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    paid: false, secret: false, // part 1
    handed: false, revealed: false, // part 2
    q: 30, z: 2, // part 3
    tried: '' as '' | 'own' | 'steal' | 'fake', // part 4
    conf: 1, // part 5
  }

  /** a row of blocks: `n` grey shared blocks first, then the labelled ones */
  const lane = (label: string, color: string, blocks: string[], opts: { shared?: number; gone?: boolean; tag?: string; tone?: string } = {}) =>
    `<div class="gs-lane${opts.gone ? ' gone' : ''}" style="--c:${color}"><div class="gs-lane-h"><b>${label}</b>${opts.tag ? `<em class="${opts.tone ?? ''}">${opts.tag}</em>` : ''}</div><div class="gs-cbs">`
    + Array.from({ length: opts.shared ?? 2 }, () => '<span class="gs-cb sh"></span>').join('')
    + blocks.map((b) => `<span class="gs-cb${b ? ' pay' : ''}">${b}</span>`).join('') + '</div></div>'
  const shop = (bike: 'shop' | 'alice', coins: boolean) =>
    `<div class="gs-shop"><span class="gs-ico">🏪</span><b>Bob's shop</b><span>${bike === 'shop' ? '🚲 bike for sale' : '🚲 → Alice'}</span><span class="${coins ? 'ok' : 'bad'}">${coins ? '5 coins received' : 'no coins'}</span></div>`

  /** chance to catch up (up) against Alice's share of the mining power (across, 0–60%) */
  function chart() {
    const pts = Array.from({ length: 61 }, (_, x) => `${(x / 60) * 100},${100 - chance(x / 100, st.z) * 100}`).join(' ')
    const v = chance(st.q / 100, st.z)
    return `<div class="gs-chart"><span class="gs-ax y">↑ chance to catch up</span><div class="gs-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">`
      + `<line class="half" x1="${(50 / 60) * 100}" y1="0" x2="${(50 / 60) * 100}" y2="100"/><polyline points="${pts}"/></svg>`
      + `<span class="gs-ax h" style="left:${(50 / 60) * 100}%">50%</span><i class="gs-dot" style="left:${(st.q / 60) * 100}%;top:${100 - v * 100}%"></i></div>`
      + `<span class="gs-ax x">Alice's share of mining power →</span></div>`
      + `<p class="gs-big">${st.q}% of the power, ${st.z} block${st.z > 1 ? 's' : ''} behind: <b class="${v >= 0.01 ? 'bad' : 'ok'}">${pctText(v)}</b></p>`
  }

  function draw() {
    const k = st.active
    if (k === 0) {
      paint(box, lane('Public chain', 'var(--mint)', st.paid ? ['Alice → Bob 5 ✓'] : [], { tag: st.paid ? 'everyone sees this' : '' })
        + lane("Alice's secret chain", '#ff9a3c', st.secret ? ['Alice → Alice 5 ✓'] : [], { tag: st.secret ? 'only Alice knows' : '' })
        + `<p class="gs-big">${st.paid && st.secret ? '<b class="bad">Same 5 coins</b> spent twice. Only one can stay.' : 'Both payments can carry a <b class="ok">valid signature</b>'}</p>`)
    }
    if (k === 1) {
      const won = st.revealed
      paint(box, `<div class="gs-ds-row"><div>${lane('Public chain', 'var(--mint)', ['Alice → Bob 5', ''], { gone: won, tag: won ? '✗ dropped' : '✓ followed', tone: won ? 'bad' : 'ok' })}`
        + lane("Alice's secret chain", '#ff9a3c', st.revealed ? ['Alice → Alice 5', '', ''] : [], { tag: won ? '✓ longer, so followed' : 'hidden…', tone: won ? 'bad' : '' })
        + `</div>${shop(st.handed ? 'alice' : 'shop', !won)}</div>`
        + `<p class="gs-big">${won ? '<b class="bad">Bob lost</b> the bike and the coins' : st.handed ? 'Bob saw the payment and handed over the bike' : 'Alice paid. Will Bob hand over the bike?'}</p>`)
    }
    if (k === 2) paint(box, chart())
    if (k === 3) {
      const row = (key: string, text: string, ok: boolean, why: string) =>
        `<div class="gs-try-row${st.tried === key ? ' on' : ''}"><b class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</b><span>${text}</span>${st.tried === key ? `<em>${why}</em>` : ''}</div>`
      paint(box, `<div class="gs-power"><span class="lbl">Alice's mining power</span><span class="gs-meter bad"><i style="width:70%"></i></span><b>70%</b></div>`
        + row('own', 'Undo her own recent payment', true, 'Possible: she can out-mine everyone and rewrite recent history.')
        + row('steal', "Spend Charlie's coins", false, "Impossible: that needs Charlie's secret key.")
        + row('fake', 'Get a fake signature accepted', false, 'Impossible: every node rejects it.'))
    }
    if (k >= 4) {
      const risk = chance(Q, st.conf), wait = st.conf * 10
      paint(box, `<div class="gs-gauges"><div><span class="lbl">Risk Bob gets cheated</span><span class="gs-meter bad"><i style="width:${risk * 100}%"></i></span><b class="bad">${pctText(risk)}</b></div>`
        + `<div><span class="lbl">Time Bob waits</span><span class="gs-meter gold"><i style="width:${(wait / 60) * 100}%"></i></span><b class="gold">${wait ? `about ${wait} min` : 'no wait'}</b></div></div>`
        + `<p class="lnote">For a cheater with ${Q * 100}% of the mining power, if blocks come about every 10 minutes.</p>`
        + `<div class="gs-cbs">${Array.from({ length: st.conf + 1 }, (_, i) => `<span class="gs-cb${i === 0 ? ' pay' : ''}">${i === 0 ? 'Pay' : ''}</span>`).join('')}</div>`)
    }
  }

  return {
    show(k) { st.active = k; draw() },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="pay">Alice pays Bob’s shop</button><button class="btn sm danger" data-a="self">Alice secretly pays herself the same coins</button>')
        const report = () => {
          draw()
          t.msg(st.paid && st.secret ? 'bad' : '', st.paid && st.secret ? 'Both payments are properly signed, but they spend the same coins. They can never both be in one history.' : st.paid ? 'A normal, signed payment.' : 'A secret, signed payment.')
        }
        t.q('pay').onclick = () => { st.paid = true; report() }
        t.q('self').onclick = () => { st.secret = true; report() }
      }
      if (k === 1) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="hand">Bob hands over the bike</button><button class="btn sm danger" data-a="reveal" disabled>Alice reveals her longer chain</button><button class="btn sm" data-a="reset">Reset</button>')
        t.q('hand').onclick = () => { st.handed = true; t.q('hand').disabled = true; t.q('reveal').disabled = false; t.msg('', 'Bob saw the payment in a block and handed over the bike.'); draw() }
        t.q('reveal').onclick = () => {
          st.revealed = true; t.q('reveal').disabled = true
          t.msg('bad', "Alice's chain has more work, so every node switches to it. In that history Alice paid herself, so Bob's payment is gone, and so is the bike.")
          ctx.say('Ouch. That’s a double spend. That’s why shops wait for confirmations!')
          draw()
        }
        t.q('reset').onclick = () => { st.handed = false; st.revealed = false; t.q('hand').disabled = false; t.q('reveal').disabled = true; t.msg('', ''); draw() }
      }
      if (k === 2) {
        const t = tryBox(host, `<span class="down">Alice's share: <b data-a="qv">${st.q}%</b></span><input type="range" data-a="q" min="5" max="60" value="${st.q}" aria-label="Alice's share of mining power"><span class="down">Blocks behind:</span>${pickHTML('z', [1, 2, 4, 6], st.z)}`)
        const report = () => {
          const v = chance(st.q / 100, st.z)
          t.msg('', st.q >= 50 ? 'With half or more of the power, Alice catches up eventually, however far behind.' : `${pctText(v)}: not zero! A smaller miner can still get lucky. There's no magic switch at 51%.`)
          draw()
        }
        t.q<HTMLInputElement>('q').oninput = (e) => { st.q = +(e.target as HTMLInputElement).value; t.q<HTMLElement>('qv').textContent = st.q + '%'; report() }
        t.all('[data-z]').forEach((b) => (b.onclick = () => { st.z = +b.dataset.z!; markPick(host, 'z', st.z); report() }))
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm" data-a="own">Undo her own payment</button><button class="btn sm" data-a="steal">Spend Charlie’s coins</button><button class="btn sm" data-a="fake">Fake a signature</button>')
        const say: Record<string, [string, string]> = {
          own: ['bad', 'With most of the power, Alice can replace recent history, so this one can work.'],
          steal: ['ok', "No amount of mining reveals Charlie's secret key, so Charlie's coins are safe."],
          fake: ['ok', 'Full nodes reject a block with a fake signature, however much work is behind it.'],
        }
        ;(['own', 'steal', 'fake'] as const).forEach((a) => (t.q(a).onclick = () => { st.tried = a; t.msg(say[a][0] as 'ok' | 'bad', say[a][1]); draw() }))
      }
      if (k === 4) {
        const t = tryBox(host, `<span class="down">Bob waits for <b data-a="cv">${st.conf}</b> blocks on top</span><input type="range" data-a="c" min="0" max="6" value="${st.conf}" aria-label="Confirmations">`)
        t.q<HTMLInputElement>('c').oninput = (e) => {
          st.conf = +(e.target as HTMLInputElement).value
          t.q<HTMLElement>('cv').textContent = String(st.conf)
          t.msg('', st.conf === 0 ? 'No waiting, but a big risk.' : `${st.conf} confirmations: risk ${pctText(chance(Q, st.conf))}, wait about ${st.conf * 10} minutes. Safer, but slower.`)
          draw()
        }
      }
    },
    caption: (k) => at([
      'Two signed payments. Same coins.',
      "The longer chain wins, and Bob's payment vanishes.",
      'The chance rises smoothly. 51% is no magic line.',
      "Mining power can't forge signatures.",
      'More confirmations: less risk, more waiting.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default doubleSpend
