/**
 * Orbit 4, "Forks and chain selection": a Story Scroll ported from the prototype (algoverse-prototype.html,
 * Blockchain LESSONS "Longest chain wins": "Nobody hosts the ledger" through "You just built Bitcoin").
 * Built like SignaturesStory: the story scrolls on the left, a scene of chain "lanes" (rows of blocks) sits on the
 * right with Back/Next, and there's a quick check at the end. All the text lives here.
 */
import { useEffect, useRef } from 'react'
import AlgoChat from '../AlgoChat'
import type { LessonProps } from '../StoryLayout'
import { NAMES, PCOL, catchUp, laneHTML, navHTML, pct, quiz, sleep, storyParts } from './storyKit'
import '../story.css'

const MINT = 'var(--mint)', SKY = 'var(--sky)', ORANGE = '#ff9a3c'
const WAITS = [1, 2, 3, 6] // catchUp(z) is for a cheater with 10% of the computing power

export default function LongestChainStory({ planetId, moon, onBack, onComplete }: LessonProps) {
  const mainRef = useRef<HTMLElement>(null)

  // Keep the latest onComplete without re-running the setup
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete })

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    let alive = true

    const $ = <T extends HTMLElement = HTMLElement>(id: string) => main.querySelector(`#${id}`) as T

    const st = {
      copies: 4, // part 1
      a: 2, b: 2, // part 2
      q: 20, honest: 0, fake: 1, running: false, // part 3
      wait: 0, // part 4
      fresh: false, // the newest block pops in once
    }

    const SEC = [
      { h: 'Nobody hosts the ledger', b: `<p>To avoid trusting one website, <b>everyone keeps their own copy</b> of the blockchain. These are the <b>nodes</b> you met on the last moon. Miners broadcast new blocks, and everyone adds them to their copy.</p><button class="btn gold sm" id="c0add">A miner broadcasts a block</button><p style="margin-top:12px">But if copies ever disagree, which one is right?</p><div class="kbox"><b>Key idea</b><span>The rule: trust the chain with the most work in it. Usually that's simply the longest one.</span></div><p class="down">Scroll down to keep going ↓</p>` },
      { h: 'Two chains? Pick the longer one', b: `<p>Sometimes two miners find a block at the same moment, and the chain splits in two. Add blocks to each side and see which one you'd trust.</p><div class="row"><button class="btn sm" id="c1a">+ block on A</button><button class="btn sm" id="c1b">+ block on B</button><button class="btn sm" id="c1reset">Reset</button></div><p class="fb" id="c1r"></p><div class="kbox"><b>Key idea</b><span>Always follow the longest chain. If it's a tie, wait for the next block.</span></div>` },
      { h: 'Alice tries to fool Bob', b: `<p>Alice secretly mines a fake block saying she paid Bob, and sends it only to Bob. To keep fooling him, her fake chain has to stay <b>longer</b> than the real chain that every other miner is building.</p><p>Choose how much of the world's computing power Alice has, then run it.</p><div class="pay"><span>Alice's share of computing power: <b id="c2qv">20%</b></span><input type="range" id="c2q" min="5" max="60" value="20" aria-label="Alice's share of computing power"><button class="btn gold sm" id="c2go">Run</button><p class="fb" id="c2r" hidden></p></div><div class="kbox"><b>Key idea</b><span>Unless Alice has about half of all the computing power, the honest chain pulls ahead and Bob drops her fake.</span></div>` },
      { h: 'So wait a few blocks', b: `<p>A brand-new block might still lose to a longer chain. So don't trust a payment straight away. Wait until <b>several blocks</b> have been added on top of it.</p><p>Here's the chance a cheater with <b>10%</b> of the computing power ever catches up, depending on how many blocks you wait:</p><div class="vbars">${WAITS.map((z) => `<div class="vb" data-z="${z}"><span>Wait ${z} block${z > 1 ? 's' : ''}</span><span class="bar"><i style="width:${Math.max(0.6, (catchUp(z) / catchUp(1)) * 100)}%"></i></span><span class="n">${pct(catchUp(z))}</span></div>`).join('')}</div><p class="down">Worked out as (10/90)<sup>blocks</sup>, a simplified form of the maths in the original Bitcoin paper.</p><div class="row"><button class="btn gold sm" id="c3add">Add a block on top</button><button class="btn sm" id="c3reset">Start over</button></div><div class="kbox"><b>Key idea</b><span>Each block you wait makes cheating far less likely. Many Bitcoin users wait for 6.</span></div>` },
      { h: 'You just built Bitcoin', b: `<ul class="checkl"><li><span>A <b>ledger</b>: the history of payments is the money</span></li><li><span><b>Hashes</b>: one-way fingerprints</span></li><li><span><b>Signatures</b>: only you can spend your coins</span></li><li><span><b>Blocks</b>: each one holds the hash of the one before</span></li><li><span><b>Proof of work</b>: blocks are expensive to make and cheap to check</span></li><li><span><b>Longest chain</b>: everyone agrees without a boss</span></li></ul><p>Bitcoin adjusts the puzzle so a new block appears about every <b>10 minutes</b>. The reward started at <b>50 bitcoin</b> and halves every 210,000 blocks (about 4 years), so there will never be more than <b>21 million</b>. Miners also earn small <b>fees</b> that people add to get their payments included.</p><div class="kbox"><b>Key idea</b><span>No bank and no boss. Just maths, copies, and the chain with the most work.</span></div><div id="c4q"></div><div class="donebar" id="c4done" hidden><button class="btn go" id="c4complete">Complete moon</button><span class="down">Next up: double spending and majority attacks.</span></div>` },
    ]
    main.innerHTML = `<div class="i1"><div class="i1-story"><div class="prog1"><i id="sp"></i></div>${SEC.map((s, i) => `<section class="sec" data-k="${i}"><span class="secn">Part ${i + 1} of ${SEC.length}</span><h2>${s.h}</h2>${s.b}</section>`).join('')}</div>
      <div class="i1-stage"><div class="scene ls" id="sscene"></div><p class="i1-cap" id="scap"></p>
        ${navHTML}</div></div>`
    const scene = $('sscene')
    let active = -1
    const cap = (t: string) => ($('scap').textContent = t)

    // what the scene shows for the current part
    const draw = () => {
      const fresh = st.fresh
      st.fresh = false
      if (active === 0) {
        scene.innerHTML = laneHTML(NAMES.map((n) => ({ label: `${n}'s copy`, color: PCOL[n], n: st.copies, fresh })))
          + '<p class="lnote">Every copy has the same blocks.</p>'
      }
      if (active === 1) {
        const { a, b } = st
        scene.innerHTML = laneHTML([
          { label: 'Chain A', color: MINT, shared: 2, n: a, tag: a > b ? '✓ Everyone follows this' : a === b ? 'Tie…' : '', tone: a > b ? 'ok' : undefined, fresh },
          { label: 'Chain B', color: SKY, shared: 2, n: b, tag: b > a ? '✓ Everyone follows this' : a === b ? 'Tie…' : '', tone: b > a ? 'ok' : undefined, fresh },
        ]) + '<p class="lnote">Grey blocks came before the split.</p>'
      }
      if (active === 2) {
        const fooled = st.fake > st.honest
        scene.innerHTML = laneHTML([
          { label: 'Honest miners', color: MINT, n: st.honest, tag: fooled ? '' : '✓ Bob trusts this', tone: 'ok' },
          { label: "Alice's fake", color: ORANGE, n: st.fake, pay: 0, tag: fooled ? '✗ Bob trusts this' : '', tone: 'bad' },
        ]) + `<p class="lnote">The gold-ringed block holds Alice's fake payment. Alice has ${st.q}% of the computing power.</p>`
      }
      if (active === 3) {
        scene.innerHTML = laneHTML([{ label: 'Your payment + blocks on top', color: MINT, n: st.wait + 1, pay: 0, tag: `${st.wait} on top`, tone: 'ok', fresh }])
          + `<p class="lnote">Chance a 10% cheater catches up</p><p class="lnote"><span class="bign">${pct(catchUp(st.wait))}</span></p>`
      }
      if (active === 4) {
        scene.innerHTML = laneHTML([{ label: 'The blockchain', color: MINT, n: 9, tag: 'No bank, no boss', tone: 'ok' }])
          + '<p class="lnote">Everyone keeps a copy, and everyone follows the chain with the most work.</p>'
      }
    }

    const apply = (k: number) => {
      if (k === active) return
      active = k
      main.querySelectorAll<HTMLElement>('.sec').forEach((s) => s.classList.toggle('on', +s.dataset.k! === k))
      $('sp').style.width = ((k + 1) / SEC.length) * 100 + '%'
      $('spart').textContent = `Part ${k + 1} of ${SEC.length}`
      $<HTMLButtonElement>('sback').disabled = k === 0
      $<HTMLButtonElement>('snext').disabled = k === SEC.length - 1
      draw()
      cap([
        "Everyone's copy of the chain.",
        'A fork: two chains share the same start.',
        "Bob follows whichever chain is longer.",
        'Each block on top makes the payment safer.',
        'Maths, copies, and the chain with the most work.',
      ][k])
    }

    const parts = storyParts(main, apply)
    apply(0)

    // Back/Next: scroll the story to the previous/next part (the observer then updates everything else)
    $('sback').onclick = () => parts.go(-1)
    $('snext').onclick = () => parts.go(1)
    // redraw the scene for part `k` (if it's showing), with the newest block popping in
    const grow = (k: number) => { st.fresh = true; if (active === k) draw(); else st.fresh = false }

    // Part 1: a miner broadcasts a block and every copy adds it
    const add = $<HTMLButtonElement>('c0add')
    add.onclick = () => {
      st.copies++; grow(0)
      if (st.copies >= 10) add.disabled = true // the copies are full for now
    }

    // Part 2: a fork; add blocks to either side
    const showFork = () => {
      const { a, b } = st
      const r = $('c1r')
      r.className = a === b ? 'fb' : 'fb ok'
      r.textContent = a === b ? "It's a tie. Wait for the next block." : `You'd trust Chain ${a > b ? 'A' : 'B'}. It has the most work.`
    }
    $('c1a').onclick = () => { if (st.a < 9) { st.a++; grow(1); showFork() } }
    $('c1b').onclick = () => { if (st.b < 9) { st.b++; grow(1); showFork() } }
    $('c1reset').onclick = () => { st.a = 2; st.b = 2; if (active === 1) draw(); showFork() }
    showFork()

    // Part 3: Alice's fake chain races the honest one; each round one side finds the next block
    $<HTMLInputElement>('c2q').oninput = (e) => {
      st.q = +(e.target as HTMLInputElement).value
      $('c2qv').textContent = st.q + '%'
      if (active === 2) draw()
    }
    $<HTMLButtonElement>('c2go').onclick = async () => {
      if (st.running) return
      st.running = true; st.honest = 0; st.fake = 1
      const btn = $<HTMLButtonElement>('c2go'), slider = $<HTMLInputElement>('c2q'), r = $('c2r')
      btn.disabled = true; slider.disabled = true; r.hidden = true
      if (active === 2) draw()
      let msg = '', cls = 'ok'
      while (alive && !msg) {
        await sleep(550)
        if (!alive) return
        if (Math.random() < st.q / 100) st.fake++; else st.honest++
        if (st.honest - st.fake >= 3) msg = "The honest chain got 3 blocks ahead. Bob switches to it and Alice's fake payment disappears."
        else if (st.fake >= 11 || st.honest >= 11) {
          if (st.fake > st.honest) { msg = 'Alice kept up! With this much power she can fool Bob. This is why no one should control half the network.'; cls = 'bad' }
          else msg = "The honest chain stayed ahead. Bob isn't fooled."
        }
        if (active === 2) draw()
      }
      st.running = false; btn.disabled = false; slider.disabled = false; btn.textContent = 'Run again'
      r.hidden = false; r.className = 'fb ' + cls; r.textContent = msg
    }

    // Part 4: add blocks on top of a payment and watch the cheater's chance shrink
    const showWait = () => main.querySelectorAll<HTMLElement>('[data-z]').forEach((v) => v.classList.toggle('on', +v.dataset.z! === st.wait))
    $('c3add').onclick = () => {
      if (st.wait >= 6) return
      st.wait++; grow(3); showWait()
    }
    $('c3reset').onclick = () => { st.wait = 0; if (active === 3) draw(); showWait() }

    // Part 5: quick check, then complete the moon
    quiz($('c4q'), 'Quick check: two valid chains disagree. Which one does everyone follow?', [
      ['The one with the most work in it, usually the longest', true, 'Exactly. Most work wins. A cheater would have to out-mine everyone else to beat it.'],
      ['The one with the newest block', false, "Newer doesn't mean more work. Everyone follows the chain with the most work behind it."],
      ['Whichever one a big website says is right', false, "There's no boss to ask! Everyone checks for themselves and follows the chain with the most work."],
    ], () => { $('c4done').hidden = false })
    $('c4complete').onclick = () => complete.current?.(moon.id)

    return () => { alive = false; parts.stop() }
  }, [moon.id])

  return (
    <div className="nv cpage">
      <header className="cbar">
        {onBack && <button className="btn sm" onClick={onBack}>← Moons</button>}
        <div className="cbar-t">
          <span className="eyebrow">{planetId} · Moon {moon.order}</span>
          <h1>Forks and chain selection</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef} />
      <AlgoChat planetId={planetId} moonId={moon.id} />
    </div>
  )
}
