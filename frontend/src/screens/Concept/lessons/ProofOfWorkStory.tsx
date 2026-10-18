/**
 * Orbit 3, "Proof of work": a Story Scroll ported from the prototype (algoverse-prototype.html, Blockchain LESSONS
 * "Proof of work": "The puzzle" through "Miners and the reward"), plus a short recap with the quick check.
 * Built like SignaturesStory: the story scrolls on the left, the fingerprint scene from storyKit sits on the right
 * (covered by the chain or the mining race when a part needs them), with Back/Next. All the text lives here.
 */
import { useEffect, useRef, useState } from 'react'
import AlgoChat, { type Reaction } from '../AlgoChat'
import type { LessonProps } from '../StoryLayout'
import { MINERS, ZERO, bstr, chainHTML, esc, hashHTML, makeChain, makeHashScene, makeQuiz, navHTML, raceHTML, raceMiners, sha256, sleep, storyParts, valid, type RaceResult } from './storyKit'
import '../story.css'

/** Nib's pre-written answers for this moon from the prototype (plus two more), now Algo's */
const QUICK_ANSWERS: [string, string][] = [
  ["What's a nonce?", "A nonce is the extra number miners keep changing. They try 0, 1, 2… until the block's hash starts with enough zeros. That lucky number proves they did the work."],
  ['Why is mining hard but checking easy?', "Finding the nonce can take billions of guesses, but checking it takes one hash. That's the whole trick: expensive to make, cheap to verify."],
  ['Why does changing an old block break the chain?', "Each block holds the hash of the block before it. Change an old block and its hash changes, so the next block's “previous hash” no longer fits, and so on. You'd have to redo the work for every block after it."],
  ['Where do new coins come from?', "The miner who finds a valid block gets to add a reward line paying themselves new coins. That's the only way new bitcoin is created."],
  ['Does the fastest computer always win?', 'No! A faster computer makes more guesses, so it wins more often. But every guess is like a lottery ticket, so a slower miner can still get lucky.'],
]
/** Questions for the AI tutor (need the backend) */
const SUGGESTED = ['Why is expected search time not guaranteed?', 'How does adding one required hexadecimal zero change expected attempts?']

const TX = 'Alice pays Bob 20\nBob pays Charlie 5\nCharlie pays Alice 8'

export default function ProofOfWorkStory({ planetId, moon, onBack, onComplete }: LessonProps) {
  const mainRef = useRef<HTMLElement>(null)
  const [reaction, setReaction] = useState<Reaction>({ text: "Remember the nonce from last moon? Now we'll put it to work! Scroll down, and ask me anything on the way.", key: 0 })

  // Keep the latest callbacks without re-running the setup
  const say = useRef((text: string) => setReaction({ text, key: Date.now() }))
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete })

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const algoSay = (t: string) => say.current(t)
    let alive = true
    let parts: ReturnType<typeof storyParts> | undefined

    const $ = <T extends HTMLElement = HTMLElement>(id: string) => main.querySelector(`#${id}`) as T
    const quiz = makeQuiz(algoSay)

    async function setup(main: HTMLElement) {
      // The puzzle's answer (for part 2) and a starting chain of three mined blocks (for part 3)
      let solve = 0
      while (!(await sha256(TX + '|' + solve)).startsWith('00')) solve++
      const solveHash = await sha256(TX + '|' + solve)
      const firstHash = await sha256(TX + '|0')
      const chain0 = await makeChain()
      if (!alive) return

      const st = {
        nonce: 0, shown: 0, h: firstHash, found: null as number | null, // part 1
        checked: false, // part 2
        chain: chain0, mining: -1, // part 3
        tries: null as number[] | null, win: null as RaceResult | null, // part 4
      }

      const SEC = [
        { h: 'The puzzle', b: `<p>Take a list of payments and add a number to the end. Now find a number that makes the hash <b>start with 00</b>.</p><p>Because hashes only go one way, the only method is to try 0, 1, 2, 3… until one works. That number is the <b>nonce</b> you met on the last moon.</p><div class="pay"><b>Block</b><span class="mono" style="white-space:pre-line">${TX}</span><div class="row"><span class="down">Nonce</span><span class="bign" id="p0n">0</span></div><div class="sigout hx" id="p0h">${hashHTML(firstHash, 2)}</div><div class="row"><button class="btn sm" id="p0next">Try next number</button><button class="btn sm gold" id="p0auto">Mine automatically</button><button class="btn sm" id="p0reset">Reset</button></div><p class="fb" id="p0m" hidden></p></div><div class="kbox"><b>Key idea</b><span>Finding the nonce takes lots of guesses. That effort is called proof of work.</span></div><p class="down">Scroll down to keep going ↓</p>` },
        { h: 'Hard to find, easy to check', b: `<p>Finding the nonce took many guesses. <b>Checking it takes one.</b> Anyone can hash the block once and see the zeros.</p><p>Bitcoin's puzzle needs far more zeros. With 30 zeros in binary, that's about <b>1 billion guesses</b> to find, and still only 1 to check.</p><div class="pay"><b>Someone claims</b><span>Nonce <b class="mono">${solve}</b> solves this block.</span><button class="btn gold sm" id="p1chk">Check it</button><div class="sigout hx" id="p1h" hidden>${hashHTML(solveHash, 2)}</div><p class="fb ok" id="p1r" hidden>✓ Checked with 1 hash. Finding it took ${solve + 1}.</p></div><div class="kbox"><b>Key idea</b><span>Proof of work: easy to verify, very expensive to fake.</span></div>` },
        { h: 'Chain the blocks together', b: `<p>Remember: payments are grouped into <b>blocks</b>, and each block holds the <b>hash of the block before it</b>. Now every block also needs its own nonce, so its hash starts with 00.</p><p>Change block 1 below. Its hash changes, so block 2's “previous hash” changes, so block 2's hash changes too… and the whole rest of the chain breaks.</p><div class="inl"><b>Block 1</b><input type="text" class="txt" id="p2in" aria-label="Block 1 data" value="${esc(chain0[0].data)}"></div><div class="row">${chain0.map((_, i) => `<button class="btn sm gold" data-m="${i}">Re-mine block ${i + 1}</button>`).join('')}<button class="btn sm" id="p2reset">Reset chain</button></div><p class="fb" id="p2r" hidden></p><div class="kbox"><b>Key idea</b><span>To change old history you'd have to redo the work for that block and every block after it.</span></div>` },
        { h: 'Miners and the reward', b: `<p>Anyone can build blocks. These people are called <b>miners</b>. They collect payments, race to find the nonce, and broadcast the block when they win.</p><p>The winner gets to add one special line at the top: <b>new coins for themselves</b>, out of thin air. That's the <b>block reward</b>, and it's how new money enters the system.</p><p>This race needs a hash starting with <b>000</b>. Gold has the fastest computer, but luck matters most.</p><button class="btn gold" id="p3go">Start the race</button><p class="fb" id="p3r" hidden style="margin-top:10px"></p><div class="kbox"><b>Key idea</b><span>Mining is a lottery: whoever finds a valid nonce first wins the reward.</span></div>` },
        { h: 'What proof of work gives us', b: `<ul class="checkl"><li><span><b>A puzzle</b>: find a nonce that makes the hash start with zeros</span></li><li><span><b>Hard to find, easy to check</b>: many guesses to solve, one hash to verify</span></li><li><span><b>Chained work</b>: changing an old block means redoing it and every block after</span></li><li><span><b>A reward</b>: the winning miner gets new coins</span></li></ul><p>But how hard should the puzzle be, and what happens to the reward over time? That's the next moon.</p><div class="kbox"><b>Key idea</b><span>Work is cheap to check and expensive to fake, so rewriting history gets very costly.</span></div><div id="p4q"></div><div class="donebar" id="p4done" hidden><button class="btn go" id="p4complete">Complete moon</button><span class="down">Next up: difficulty and rewards.</span></div>` },
      ]
      main.innerHTML = `<div class="i1"><div class="i1-story"><div class="prog1"><i id="sp"></i></div>${SEC.map((s, i) => `<section class="sec" data-k="${i}"><span class="secn">Part ${i + 1} of ${SEC.length}</span><h2>${s.h}</h2>${s.b}</section>`).join('')}</div>
        <div class="i1-stage"><div id="sscene"></div><p class="i1-cap" id="scap"></p>
          ${navHTML}</div></div>`
      const sc = makeHashScene($('sscene'))
      let active = -1
      const cap = (t: string) => ($('scap').textContent = t)


      // what the scene shows for the current part
      const draw = () => {
        if (active === 0) {
          sc.bars(st.h, 2)
          sc.core(st.found !== null ? '✓ Solved!' : `Nonce ${st.shown}`, st.found !== null ? `took ${st.found + 1} guesses` : 'needs 00 at the start', st.found !== null ? 'ok' : '')
        }
        if (active === 1) {
          sc.bars(solveHash, st.checked ? 2 : 0)
          sc.core(st.checked ? '✓ Valid' : `Nonce ${solve}?`, st.checked ? 'checked with 1 hash' : 'is it right? Check it!', st.checked ? 'ok' : '')
        }
        if (active === 2) sc.cover(chainHTML(st.chain, (b, i) => (st.mining === i ? ['busy', 'Mining…'] : valid(b) ? ['ok', 'Valid'] : ['bad', 'Broken'])))
        if (active === 3) sc.cover(raceHTML(MINERS, st.tries, st.win, 3))
        if (active === 4) { sc.bars(st.win?.hash ?? solveHash, st.win ? 3 : 2); sc.core('✓ Proof of work', 'hard to find, easy to check', 'ok') }
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
          'Mint bars hit the target. Red ones missed.',
          'Finding took many guesses. Checking takes one.',
          'Each block holds the hash of the one before it.',
          'Whoever finds a valid nonce first wins the reward.',
          'Expensive to make, cheap to check.',
        ][k])
      }

      parts = storyParts(main, apply)
      apply(0)

      // Back/Next: scroll the story to the previous/next part (the observer then updates everything else)
      $('sback').onclick = () => parts?.go(-1)
      $('snext').onclick = () => parts?.go(1)

      // Part 1: try nonces one by one (or let the computer do it) until the hash starts with 00
      let mineRun = 0 // bumped to stop "Mine automatically"
      const showMine = () => {
        $('p0n').textContent = String(st.shown)
        $('p0h').innerHTML = hashHTML(st.h, 2)
        const m = $('p0m'); m.hidden = false; m.className = st.found !== null ? 'fb ok' : 'fb'
        m.textContent = st.found !== null ? `Found it! Nonce ${st.found} works. That took ${st.found + 1} guesses.` : `Nonce ${st.shown} doesn't work…`
        if (active === 0) draw()
      }
      const step = async () => {
        const n = st.nonce
        const h = await sha256(TX + '|' + n)
        if (!alive || st.found !== null || n !== st.nonce) return
        st.h = h; st.shown = n
        if (h.startsWith('00')) st.found = n; else st.nonce++
        showMine()
      }
      const onSolved = () => algoSay(`Nonce ${st.found} works! That's proof you did the work. Now see how quickly anyone can check it.`)
      $('p0next').onclick = async () => {
        mineRun++
        if (st.found !== null) return
        await step()
        if (st.found !== null) onSolved()
      }
      $('p0auto').onclick = async () => {
        if (st.found !== null) return
        const run = ++mineRun
        while (alive && run === mineRun && st.found === null) {
          await step(); await step(); await sleep(16)
        }
        if (st.found !== null && run === mineRun) onSolved()
      }
      $('p0reset').onclick = () => {
        mineRun++
        Object.assign(st, { nonce: 0, shown: 0, h: firstHash, found: null })
        showMine(); $('p0m').hidden = true
      }

      // Part 2: check the claimed nonce with a single hash
      $('p1chk').onclick = () => {
        if (st.checked) return
        st.checked = true
        $('p1h').hidden = false; $('p1r').hidden = false
        algoSay(`One hash to check, ${solve + 1} to find. That's the magic of proof of work!`)
        if (active === 1) draw()
      }

      // Part 3: edit block 1, watch the chain break, then re-mine block by block
      let chainRun = 0
      const showChain = () => {
        main.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) => (b.disabled = st.mining >= 0 || valid(st.chain[+b.dataset.m!])))
        $<HTMLButtonElement>('p2reset').disabled = st.mining >= 0
        if (active === 2) draw()
      }
      // each block's previous hash and own hash, worked out again from the start
      const recompute = async () => {
        const run = ++chainRun
        for (let i = 0; i < st.chain.length; i++) {
          const b = st.chain[i]
          b.prev = i ? st.chain[i - 1].hash : ZERO
          const h = await sha256(bstr(b))
          if (!alive || run !== chainRun) return false
          b.hash = h
        }
        return true
      }
      const p2msg = (cls: string, text: string) => { const r = $('p2r'); r.hidden = false; r.className = 'fb ' + cls; r.textContent = text }
      let broke = false
      $<HTMLInputElement>('p2in').oninput = async (e) => {
        if (st.mining >= 0) return
        st.chain[0].data = (e.target as HTMLInputElement).value
        if (!(await recompute())) return
        showChain()
        if (!broke && !valid(st.chain[0])) { broke = true; algoSay('Uh-oh, the whole chain broke! Try re-mining the blocks.') }
      }
      main.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((btn) => (btn.onclick = async () => {
        if (st.mining >= 0) return
        const i = +btn.dataset.m!, b = st.chain[i]
        st.mining = i; $<HTMLInputElement>('p2in').disabled = true
        b.prev = i ? st.chain[i - 1].hash : ZERO; b.nonce = 0
        showChain()
        // mine with the scene updating as it goes
        for (;;) {
          b.hash = await sha256(bstr(b))
          if (!alive) return
          if (valid(b)) break
          b.nonce++
          if (b.nonce % 4 === 0) { showChain(); await sleep(16) }
        }
        st.mining = -1; $<HTMLInputElement>('p2in').disabled = false
        await recompute()
        if (!alive) return
        showChain()
        const next = st.chain.findIndex((x) => !valid(x))
        if (next < 0) { p2msg('ok', `Block ${i + 1} re-mined with nonce ${b.nonce}. The whole chain is valid again!`); algoSay('All valid again. Imagine doing that for thousands of blocks!') }
        else p2msg('', `Block ${i + 1} re-mined with nonce ${b.nonce}. Now block ${next + 1} is broken instead.`)
      }))
      $('p2reset').onclick = async () => {
        if (st.mining >= 0) return
        chainRun++
        const c = await makeChain()
        if (!alive) return
        st.chain = c; $<HTMLInputElement>('p2in').value = c[0].data; $('p2r').hidden = true
        showChain()
      }
      showChain()

      // Part 4: three miners race to find a hash starting with 000
      $<HTMLButtonElement>('p3go').onclick = async () => {
        const btn = $<HTMLButtonElement>('p3go')
        btn.disabled = true; $('p3r').hidden = true
        st.tries = null; st.win = null
        algoSay("They're off! Every guess is a lottery ticket.")
        const win = await raceMiners(MINERS, 3, () => alive, (tries) => { st.tries = tries; if (active === 3) draw() })
        if (!win) return
        st.win = win; st.tries = win.tries
        const w = MINERS[win.winner]
        const r = $('p3r'); r.hidden = false; r.className = 'fb ok'
        r.textContent = `${w.n} miner wins after ${win.tries[win.winner].toLocaleString()} guesses and earns 10 new coins!`
        btn.disabled = false; btn.textContent = 'Race again'
        algoSay(win.winner === 2 ? 'Gold had the fastest computer, and won this time. Race again: luck matters too!' : `${w.n} won without the fastest computer. Luck matters!`)
        if (active === 3) draw()
      }

      // Part 5: quick check, then complete the moon
      quiz($('p4q'), 'Quick check: why is checking a nonce so much easier than finding it?', [
        ['Checking takes one hash. Finding took lots of guesses.', true, "Exactly. Hash the block once and look for the zeros. That's proof of work: hard to find, easy to check."],
        ["Checking doesn't use a hash at all", false, 'It does use a hash, just one of them.'],
        ['Any nonce works if you wait long enough', false, 'Nope. Most nonces never work. Miners have to keep guessing until one hits the target.'],
      ], () => { $('p4done').hidden = false })
      $('p4complete').onclick = () => complete.current?.(moon.id)
    }

    setup(main)
    return () => { alive = false; parts?.stop() }
  }, [moon.id])

  return (
    <div className="nv cpage">
      <header className="cbar">
        {onBack && <button className="btn sm" onClick={onBack}>← Moons</button>}
        <div className="cbar-t">
          <span className="eyebrow">{planetId} · Moon {moon.order}</span>
          <h1>Proof of work</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef} />
      <AlgoChat planetId={planetId} moonId={moon.id} quickAnswers={QUICK_ANSWERS} suggested={SUGGESTED} reaction={reaction} />
    </div>
  )
}
