/**
 * Blocks: one block being put together. Payments wait in a pool and get packed in; the header holds the previous
 * block's fingerprint, a fingerprint of the payments, the time and a nonce; the block's own hash sits at the bottom.
 * Parts: pack a batch · inspect the parts · a valid vs an overspending batch · words vs real bytes · link to the block before.
 */
import { at, chip, esc, life, markPick, paint, pickHTML, sha256, tryBox, type SceneMaker } from './kit'

const POOL = ['Alice pays Bob 3', 'Alice pays Bob 2', 'Bob pays Charlie 4', 'Charlie pays Alice 1', 'Bob pays Alice 2']
const BATCHES: Record<string, [number, number]> = { '3 + 2': [3, 2], '8 + 8': [8, 8] }
const FIELDS: Record<string, [label: string, about: string]> = {
  pay: ['Payments', 'The payload: the batch of payments this block adds to the history.'],
  prev: ['Previous block', 'The fingerprint of the block before this one. That is how blocks line up in order.'],
  root: ['Payments fingerprint', 'One hash that sums up every payment inside (the Merkle trees moon shows how).'],
  time: ['Time', 'Roughly when the block was made.'],
  nonce: ['Nonce', 'A number miners keep changing while they mine (more on the Nonce moon).'],
  hash: ['Block hash', "The block's own fingerprint, made from everything in its header."],
}
const TIME = '10:42'

const blocks: SceneMaker = (stage, ctx) => {
  stage.innerHTML = '<div class="gs gs-blocks"></div>'
  const box = stage.firstElementChild as HTMLElement
  const lf = life(ctx)
  const st = {
    active: 0,
    packed: 2, // part 1: how many pool payments are in the block
    fresh: -1, // the payment that just dropped in
    focus: 'prev', // part 2: highlighted field
    batch: '3 + 2', // part 3
    bytes: false, // part 4
    linked: false, faked: false, // part 5
    prev7: '', prev7faked: '', // block 7's hash, and after its time is faked
    root: '', hash: '',
  }

  const payments = () => {
    if (st.active === 2) { const [a, b] = BATCHES[st.batch]; return [`Alice pays Bob ${a}`, `Alice pays Bob ${b}`] }
    // only part 1 packs and empties the block; the other parts show a block with two payments
    return POOL.slice(0, st.active === 0 ? st.packed : 2)
  }
  const prevHash = () => (st.active >= 4 ? (st.linked ? st.prev7 : '') : st.prev7)

  // the block's payments fingerprint and own hash, worked out again
  async function rehash() {
    const pays = payments()
    const root = await sha256(pays.join('\n'))
    const hash = await sha256([prevHash(), root, TIME, 0].join('|'))
    if (!lf.alive()) return
    st.root = root; st.hash = hash
    draw()
  }

  const field = (f: string, value: string) => `<div class="gs-field${st.active === 1 && st.focus === f ? ' hl' : ''}"><span class="lbl">${FIELDS[f][0]}</span>${value}</div>`
  const bytesOf = (t: string) => [...new TextEncoder().encode(t)].map((b) => b.toString(16).padStart(2, '0')).join(' ')

  function payList() {
    const pays = payments()
    if (!pays.length) return '<p class="gs-empty">Empty. Add payments from the pool!</p>'
    if (st.active === 3 && st.bytes) return `<p class="gs-bytes mono">${pays.map(bytesOf).join(' 0a ')}</p>`
    if (st.active === 2) {
      let bal = 10
      return pays.map((p, i) => {
        bal -= BATCHES[st.batch][i]
        return `<div class="gs-pay${bal < 0 ? ' bad' : ''}"><span>${esc(p)}</span><span class="gs-bal">Alice: ${bal + BATCHES[st.batch][i]} → <b>${bal}</b></span></div>`
      }).join('')
    }
    return pays.map((p, i) => `<div class="gs-pay${i === st.fresh ? ' new' : ''}">${esc(p)}</div>`).join('')
  }

  function draw() {
    const k = st.active
    const overspent = k === 2 && BATCHES[st.batch][0] + BATCHES[st.batch][1] > 10
    const status = k === 2 ? (overspent ? '<span class="st bad">✗ Rejected</span>' : '<span class="st ok">✓ Valid</span>') : ''
    const prev = k >= 4
      ? (st.linked ? chip(st.prev7, 6, st.faked ? 'bad' : '') : '<span class="gs-q">?</span>')
      : chip(st.prev7)
    const block = `<div class="gs-blk${overspent ? ' bad' : ''}${k === 1 && st.focus === 'hash' ? ' hlf' : ''}">`
      + `<div class="gs-blk-h"><b>Block 8</b>${status}</div>`
      + `<div class="gs-head">${field('prev', prev)}${field('root', chip(st.root))}${field('time', `<b>${TIME}</b>`)}${field('nonce', '<b>0</b>')}</div>`
      + `<div class="gs-pays${k === 1 && st.focus === 'pay' ? ' hl' : ''}"><span class="lbl">${FIELDS.pay[0]}${k === 3 ? (st.bytes ? ' · as real bytes' : ' · as words') : ''}</span>${payList()}</div>`
      + `<div class="gs-blk-f${k === 1 && st.focus === 'hash' ? ' hl' : ''}"><span class="lbl">Block hash</span>${chip(st.hash, 10)}</div></div>`
    let html: string
    if (k === 0) {
      const waiting = POOL.slice(st.packed)
      html = `<div class="gs-blocks-row"><div class="gs-pool"><span class="lbl">Waiting payments</span>${waiting.map((p) => `<div class="gs-pay">${esc(p)}</div>`).join('') || '<p class="gs-empty">All packed!</p>'}</div>${block}</div>`
    } else if (k >= 4) {
      const link = st.linked ? `<span class="gs-arrow${st.faked ? ' bad' : ''}">→</span>` : '<span class="gs-arrow off">?</span>'
      html = `<div class="gs-blocks-row"><div class="gs-blk ghost"><div class="gs-blk-h"><b>Block 7</b></div><div class="gs-field"><span class="lbl">Time</span><b>${st.faked ? '09:00 ✎' : '10:31'}</b></div><div class="gs-blk-f"><span class="lbl">Block hash</span>${chip(st.faked ? st.prev7faked : st.prev7, 10)}</div></div>${link}${block}</div>`
    } else html = `<div class="gs-blocks-row one">${block}</div>`
    if (k === 2) html += `<p class="lnote">${overspent ? 'Alice only had 10. Having a hash does not make the batch valid.' : 'Alice starts with 10, and both payments fit.'}</p>`
    paint(box, html)
  }

  // block 7's hash, before and after someone types a new time into it
  Promise.all([sha256('block 7|10:31'), sha256('block 7|09:00')]).then(([a, b]) => { st.prev7 = a; st.prev7faked = b; rehash() })

  return {
    show(k) { st.active = k; st.fresh = -1; rehash() },
    tryIt(k, host) {
      if (k === 0) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="add">Pack the next payment</button><button class="btn sm" data-a="all">Pack them all</button><button class="btn sm" data-a="empty">Empty the block</button>')
        const report = () => { rehash(); t.msg('', st.packed ? `${st.packed} payment${st.packed > 1 ? 's' : ''} in the block. Every new payment changes the block's hash.` : 'The block is empty.') }
        t.q('add').onclick = () => {
          if (st.packed >= POOL.length) { t.msg('', 'The pool is empty. Every payment is in the block.'); return }
          st.fresh = st.packed; st.packed++; report()
        }
        t.q('all').onclick = () => { st.fresh = -1; st.packed = POOL.length; report() }
        t.q('empty').onclick = () => { st.fresh = -1; st.packed = 0; report() }
      }
      if (k === 1) {
        const t = tryBox(host, '<span class="down">Look at:</span>' + pickHTML('f', Object.keys(FIELDS), st.focus, (f) => FIELDS[f][0]))
        t.all('[data-f]').forEach((b) => (b.onclick = () => {
          st.focus = b.dataset.f!
          markPick(host, 'f', st.focus)
          t.msg('', FIELDS[st.focus][1])
          draw()
        }))
      }
      if (k === 2) {
        const t = tryBox(host, '<span class="down">Alice has 10. Her batch:</span>' + pickHTML('b', Object.keys(BATCHES), st.batch))
        t.all('[data-b]').forEach((b) => (b.onclick = () => {
          st.batch = b.dataset.b!
          markPick(host, 'b', st.batch)
          rehash()
          const bad = st.batch === '8 + 8'
          t.msg(bad ? 'bad' : 'ok', bad ? 'Rejected: after paying 8, Alice only has 2 left, so the second 8 is overspending. The block still has a hash, but that does not make it valid.' : 'Valid: 10 − 3 − 2 leaves Alice with 5.')
          if (bad) ctx.say('A hash is just a fingerprint. It can fingerprint a bad batch too!')
        }))
      }
      if (k === 3) {
        const t = tryBox(host, '<button class="btn sm" data-a="flip">Show it as real bytes</button>')
        t.q('flip').onclick = () => {
          st.bytes = !st.bytes
          t.q('flip').textContent = st.bytes ? 'Show it as words' : 'Show it as real bytes'
          t.msg('', st.bytes ? 'Real blocks store exact bytes in a fixed format. Every computer must read them the same way.' : 'Our lesson blocks use plain words to keep things simple.')
          draw()
        }
      }
      if (k === 4) {
        const t = tryBox(host, '<button class="btn sm gold" data-a="link">Link it to block 7</button><button class="btn sm danger" data-a="fake">Change block 7’s time</button>')
        t.q('link').onclick = () => {
          st.linked = !st.linked
          t.q('link').textContent = st.linked ? 'Unlink' : 'Link it to block 7'
          t.msg(st.linked ? 'ok' : '', st.linked ? "Block 8 now holds block 7's fingerprint. They're chained!" : 'A block on its own is just a batch with labels.')
          rehash()
        }
        t.q('fake').onclick = () => {
          st.faked = !st.faked
          t.q('fake').textContent = st.faked ? 'Put the time back' : 'Change block 7’s time'
          t.msg(st.faked ? 'bad' : '', st.faked
            ? (st.linked ? "Anyone can type any time, so a time can't stop a rewrite. But block 7's fingerprint changed, and block 8 still holds the old one, so the change shows." : 'Anyone can type any time. Link the blocks to see how a change gets noticed.')
            : 'Block 7 is back to how it was.')
          draw()
        }
      }
    },
    caption: (k) => at([
      'Payments wait in a pool, then get packed into a block.',
      'A block: a header of labels, plus the payments.',
      "Hashing a batch doesn't make it valid.",
      'Real blocks are exact bytes in a fixed format.',
      'A block joins the chain by holding the fingerprint of the one before.',
    ], k),
    stop: () => lf.stop(),
  }
}

export default blocks
