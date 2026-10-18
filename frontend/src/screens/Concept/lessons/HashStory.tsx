/**
 * Moon 2, "Hashing": a Story Scroll ported from the prototype (algoverse-prototype.html, Blockchain LESSONS
 * "Hash functions": "A machine that makes fingerprints" through "The three rules of a hash"), plus the tamper check
 * from the old HashingLesson. Built like SignaturesStory: the story scrolls on the left, the fingerprint scene from
 * storyKit sits on the right with Back/Next, and there's a quick check at the end. All the text lives here.
 */
import { useEffect, useRef, useState } from 'react'
import AlgoChat, { type Reaction } from '../AlgoChat'
import type { LessonProps } from '../StoryLayout'
import { esc, hashDiff, hashHTML, makeHashScene, makeQuiz, sha256, sleep } from './storyKit'
import '../story.css'

/** Nib's pre-written answers for this moon from the prototype (plus three more), now Algo's */
const QUICK_ANSWERS: [string, string][] = [
  ['What is a hash?', 'A hash is a fingerprint for data. Feed any text into a hash function like SHA-256 and you get a fixed-length code. Same text, same code, every time.'],
  ['Why is it always 64 characters?', "SHA-256 always gives out 256 bits. Each character holds 4 of them, so that's 64 characters, whether you hash one letter or a whole book."],
  ["Why can't you reverse a hash?", 'The maths scrambles the input so thoroughly that nobody has found a shortcut back. The only way to find an input for a given hash is to keep guessing.'],
  ['How does a hash catch a sneaky edit?', "Save the fingerprint when a line is written. Later, hash the line again and compare. If even one character changed, the fingerprints won't match."],
  ['Can two texts have the same hash?', "In theory, yes: there are endless texts but only 2²⁵⁶ hashes. But nobody has ever found two for SHA-256. It's so unlikely that we treat it as impossible."],
  ['Where are hashes used?', "Everywhere! Storing passwords safely, checking downloads aren't corrupted, secure websites, and of course chaining blocks together in Bitcoin."],
]
/** Questions for the AI tutor (need the backend) */
const SUGGESTED = ['Why must two computers agree on text encoding?', 'Why is hashing different from encryption?']

const HELLO = 'Hello from GUTS'
const LINE = 'Alice pays Bob 20'

export default function HashStory({ planetId, moon, onBack, onComplete }: LessonProps) {
  const mainRef = useRef<HTMLElement>(null)
  const [reaction, setReaction] = useState<Reaction>({ text: "Last time, the friends' ledger had a hole in it. Today's tool is a fingerprint for data! Scroll down, and ask me anything on the way.", key: 0 })

  // Keep the latest callbacks without re-running the setup
  const say = useRef((text: string) => setReaction({ text, key: Date.now() }))
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete })

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const algoSay = (t: string) => say.current(t)
    let alive = true
    let io: IntersectionObserver | undefined

    const $ = <T extends HTMLElement = HTMLElement>(id: string) => main.querySelector(`#${id}`) as T
    const quiz = makeQuiz(algoSay)

    async function setup(main: HTMLElement) {
      const helloHash = await sha256(HELLO)
      const lineHash = await sha256(LINE)
      if (!alive) return

      const st = {
        text: HELLO, hash: helloHash, // part 1
        a: LINE, b: LINE, ha: lineHash, hb: lineHash, changed: false, // part 2
        line: LINE, hl: lineHash, caught: false, // part 3 (the trusted fingerprint is lineHash)
        level: 2, tries: 0, gh: helloHash, found: false, // part 4
      }

      const SEC = [
        { h: 'A machine that makes fingerprints', b: `<p>A <b>hash function</b> takes any text and turns it into a fixed-size code called a <b>hash</b>. This one is <b>SHA-256</b>, the one Bitcoin uses. Its output is 256 bits, shown here as 64 characters.</p><p>Type below. Each of the 64 bars around the moon is one character of the hash.</p><div class="inl"><input type="text" class="txt" id="h0in" aria-label="Text to hash" value="${HELLO}"></div><div class="sigout" id="h0out" aria-live="polite">${helloHash}</div><div class="kbox"><b>Key idea</b><span>Any text in, a 256-bit fingerprint out. Same text, same hash, every time.</span></div><p class="down">Scroll down to keep going ↓</p>` },
        { h: 'Tiny change, totally different', b: `<p>Change just one letter and the hash changes completely. You can't predict how it will change. The bars turn <b style="color:var(--gold)">gold</b> where the hash changed.</p><div class="inl"><b>A</b><input type="text" class="txt" id="h1a" aria-label="Text A" value="${LINE}"></div><div class="sigout hx" id="h1ha">${lineHash}</div><div class="inl"><b>B</b><input type="text" class="txt" id="h1b" aria-label="Text B" value="${LINE}"><button class="btn gold sm" id="h1one">Change one letter in B</button></div><div class="sigout hx" id="h1hb">${lineHash}</div><p class="fb ok" id="h1r">Identical text gives an identical hash.</p><div class="kbox"><b>Key idea</b><span>A small change to the input scrambles the whole hash.</span></div>` },
        { h: 'Catch a sneaky edit', b: `<p>Back to the friends' ledger. When they wrote <b>“${LINE}”</b>, they saved its hash. Later, anyone can hash the line again and compare. Compare the fingerprints instead of the whole text.</p><p>Play Bob: change the 20 to 200 and watch the fingerprints.</p><div class="inl"><input type="text" class="txt" id="h2in" aria-label="Ledger line" value="${LINE}"><button class="btn sm" id="h2reset">Reset</button></div><p class="fb ok" id="h2r">✓ Match: the line is just as it was written.</p><div class="kbox"><b>Key idea</b><span>A mismatch tells you the line was changed. It can't tell you who changed it or what it said before.</span></div>` },
        { h: "There's no going backwards", b: `<p>Given a hash, there's no way to work out what text made it. The only method is <b>guess and check</b>.</p><p>Try it: find any text whose hash starts with a certain pattern. Each extra character makes it about 16 times harder.</p><div class="pay"><span id="h3goal"></span><div class="row"><button class="btn sm" id="h3one">Guess once</button><button class="btn sm gold" id="h3auto">Keep guessing</button></div><div class="sigout hx" id="h3out">No guesses yet</div><p class="fb" id="h3m" hidden></p><div class="row"><span class="down">Difficulty</span>${[1, 2, 3].map((l) => `<button class="btn sm" data-l="${l}">${'0'.repeat(l)}</button>`).join('')}</div></div><div class="kbox"><b>Key idea</b><span>Hashes only go one way. To hit a target, you can only keep guessing.</span></div>` },
        { h: 'The three rules of a hash', b: `<ul class="checkl"><li><span><b>Same input, same hash.</b> Always.</span></li><li><span><b>Tiny change, totally different hash.</b></span></li><li><span><b>No going backwards.</b> The only way to hit a target is guessing.</span></li></ul><p>That third rule is the clever bit. Later, on the Proof of work moon, it's how miners prove they did a lot of work. First, the next moon takes a closer look at rule two.</p><div class="kbox"><b>Key idea</b><span>Hashes are one-way fingerprints. Websites, banks and Bitcoin all rely on them.</span></div><div id="h4q"></div><div class="donebar" id="h4done" hidden><button class="btn go" id="h4complete">Complete moon</button><span class="down">Next up: the avalanche effect.</span></div>` },
      ]
      main.innerHTML = `<div class="i1"><div class="i1-story"><div class="prog1"><i id="sp"></i></div>${SEC.map((s, i) => `<section class="sec" data-k="${i}"><span class="secn">Part ${i + 1} of ${SEC.length}</span><h2>${s.h}</h2>${s.b}</section>`).join('')}</div>
        <div class="i1-stage"><div id="sscene"></div><p class="i1-cap" id="scap"></p>
          <div class="snav"><button class="btn sm" id="sback">← Back</button><span id="spart"></span><button class="btn sm" id="snext">Next →</button></div></div></div>`
      const sc = makeHashScene($('sscene'))
      let active = -1
      let aim = -1 // the part Back/Next is scrolling to
      const cap = (t: string) => ($('scap').textContent = t)

      // what the scene shows for the current part
      const draw = () => {
        if (active === 0) { sc.bars(st.hash); sc.core('SHA-256', 'Always 64 characters, whatever you type') }
        if (active === 1) {
          const { mask, count } = hashDiff(st.ha, st.hb)
          sc.bars(st.hb, 0, mask)
          sc.core(count ? `${count} of 64` : 'Identical', count ? 'characters changed' : 'same text, same hash')
        }
        if (active === 2) {
          const { mask, count } = hashDiff(lineHash, st.hl)
          sc.bars(st.hl, 0, mask)
          sc.core(count ? '✗ Changed!' : '✓ Match', count ? "doesn't match the saved fingerprint" : 'same as the saved fingerprint', count ? 'bad' : 'ok')
        }
        if (active === 3) {
          sc.bars(st.gh, st.level)
          sc.core(st.found ? '✓ Found it!' : st.tries ? `Guess ${st.tries.toLocaleString()}` : 'Guess and check', `target: ${'0'.repeat(st.level)} at the start`, st.found ? 'ok' : '')
        }
        if (active === 4) { sc.bars(helloHash); sc.core('Fingerprint', 'one way only') }
      }

      const apply = (k: number) => {
        if (k === active) return
        active = k; aim = -1
        main.querySelectorAll<HTMLElement>('.sec').forEach((s) => s.classList.toggle('on', +s.dataset.k! === k))
        $('sp').style.width = ((k + 1) / SEC.length) * 100 + '%'
        $('spart').textContent = `Part ${k + 1} of ${SEC.length}`
        $<HTMLButtonElement>('sback').disabled = k === 0
        $<HTMLButtonElement>('snext').disabled = k === SEC.length - 1
        draw()
        cap([
          'Any text goes in, a fixed-length fingerprint comes out.',
          'Gold bars changed between A and B.',
          'Re-hash the line and compare it with the saved fingerprint.',
          'Mint bars hit the target. Red ones missed.',
          'Same input, same hash. Change it and the hash changes.',
        ][k])
      }

      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) apply(+(e.target as HTMLElement).dataset.k!) }), { root: main, rootMargin: '-35% 0px -55% 0px' })
      main.querySelectorAll('.sec').forEach((s) => io!.observe(s))
      apply(0)

      // Back/Next: scroll the story to the previous/next part (the observer then updates everything else).
      // Counts from the part it's already heading to, so quick double clicks during the smooth scroll still move on.
      const go = (step: number) => {
        const k = Math.min(SEC.length - 1, Math.max(0, (aim >= 0 ? aim : active) + step))
        const sec = main.querySelector<HTMLElement>(`.sec[data-k="${k}"]`)
        if (!sec) return
        aim = k
        main.scrollTo({ top: main.scrollTop + sec.getBoundingClientRect().top - main.getBoundingClientRect().top })
      }
      $('sback').onclick = () => go(-1)
      $('snext').onclick = () => go(1)

      // Part 1: type anything and watch its fingerprint
      $<HTMLInputElement>('h0in').oninput = async (e) => {
        const v = (e.target as HTMLInputElement).value
        st.text = v
        const h = await sha256(v)
        if (!alive || st.text !== v) return
        st.hash = h; $('h0out').textContent = h
        if (active === 0) draw()
      }

      // Part 2: two texts side by side; changed characters of B's hash in gold
      const showAB = () => {
        const { mask, count } = hashDiff(st.ha, st.hb)
        $('h1ha').textContent = st.ha
        $('h1hb').innerHTML = hashHTML(st.hb, 0, mask)
        const r = $('h1r'); r.className = count ? 'fb' : 'fb ok'
        r.textContent = count ? `${count} of 64 characters are different.` : 'Identical text gives an identical hash.'
        if (active === 1) draw()
      }
      const setAB = async (which: 'a' | 'b', v: string) => {
        st[which] = v
        const h = await sha256(v)
        if (!alive || st[which] !== v) return
        if (which === 'a') st.ha = h; else st.hb = h
        showAB()
      }
      $<HTMLInputElement>('h1a').oninput = (e) => setAB('a', (e.target as HTMLInputElement).value)
      $<HTMLInputElement>('h1b').oninput = (e) => setAB('b', (e.target as HTMLInputElement).value)
      $('h1one').onclick = () => {
        const inp = $<HTMLInputElement>('h1b'), v = inp.value
        // like the prototype: 20 -> 21, otherwise swap the last letter
        inp.value = v.includes('20') ? v.replace('20', '21') : v.slice(0, -1) + (v.slice(-1) === 'x' ? 'y' : 'x')
        setAB('b', inp.value)
        if (!st.changed) { st.changed = true; algoSay('Just one character changed. Look how many bars turned gold!') }
      }

      // Part 3: Bob edits a ledger line; its fingerprint no longer matches the saved one
      const setLine = async (v: string) => {
        st.line = v
        const h = await sha256(v)
        if (!alive || st.line !== v) return
        st.hl = h
        const ok = h === lineHash
        const r = $('h2r'); r.className = 'fb ' + (ok ? 'ok' : 'bad')
        r.textContent = ok ? '✓ Match: the line is just as it was written.' : '✗ Mismatch: someone changed this line!'
        if (!ok && !st.caught) { st.caught = true; algoSay('Caught! Bob changed the line, and the fingerprint gives him away.') }
        if (active === 2) draw()
      }
      $<HTMLInputElement>('h2in').oninput = (e) => setLine((e.target as HTMLInputElement).value)
      $('h2reset').onclick = () => { $<HTMLInputElement>('h2in').value = LINE; setLine(LINE) }

      // Part 4: guess and check until a hash starts with the target zeros
      let guessRun = 0 // bumped to stop "Keep guessing"
      const showGoal = () => {
        $('h3goal').innerHTML = `Find text whose hash starts with <b class="mono" style="color:var(--mint)">${'0'.repeat(st.level)}</b> <span class="down">(about 1 in ${(16 ** st.level).toLocaleString()})</span>`
        main.querySelectorAll<HTMLElement>('[data-l]').forEach((b) => b.classList.toggle('on', +b.dataset.l! === st.level))
      }
      const guessOnce = async () => {
        if (st.found) { st.found = false; st.tries = 0 } // a new hunt after a win
        const txt = `guess #${st.tries + 1} ${Math.random().toString(36).slice(2, 7)}`
        const h = await sha256(txt)
        if (!alive) return false
        st.tries++; st.gh = h
        st.found = h.startsWith('0'.repeat(st.level))
        $('h3out').innerHTML = `<span class="down">${esc(txt)}</span><br>${hashHTML(h, st.level)}`
        const m = $('h3m'); m.hidden = false; m.className = st.found ? 'fb ok' : 'fb'
        m.textContent = st.found ? `Found it after ${st.tries.toLocaleString()} guesses!` : `${st.tries.toLocaleString()} guesses…`
        if (active === 3) draw()
        return st.found
      }
      const onFound = () => algoSay([
        'Easy one! Now try 00. It takes about 16 times more guessing.',
        'Found it! Try 000 next. Each extra zero means about 16 times more guesses.',
        "Phew! Lots of guessing to find, but one hash to check. Remember that, it comes back with proof of work.",
      ][st.level - 1])
      $('h3one').onclick = async () => { guessRun++; if (await guessOnce()) onFound() }
      $('h3auto').onclick = async () => {
        const run = ++guessRun
        while (alive && run === guessRun) {
          for (let i = 0; i < st.level * st.level; i++) {
            if (await guessOnce()) { guessRun++; onFound(); return }
            if (run !== guessRun) return
          }
          await sleep(16)
        }
      }
      main.querySelectorAll<HTMLButtonElement>('[data-l]').forEach((b) => (b.onclick = () => {
        guessRun++
        st.level = +b.dataset.l!; st.tries = 0; st.found = false
        $('h3out').textContent = 'No guesses yet'; $('h3m').hidden = true
        showGoal()
        if (active === 3) draw()
      }))
      showGoal()

      // Part 5: quick check, then complete the moon
      quiz($('h4q'), `Quick check: you hash “${LINE}” today, and again tomorrow. What comes out?`, [
        ['The same hash, both times', true, "Exactly. Same input, same hash, every time. That's what makes it a fingerprint."],
        ['A new random hash each time', false, "Then it'd be useless as a fingerprint! The hash only changes when the text does."],
        [`“${LINE}” again`, false, 'No going backwards! A hash never gives you the text back.'],
      ], () => { $('h4done').hidden = false })
      $('h4complete').onclick = () => complete.current?.(moon.id)
    }

    setup(main)
    return () => { alive = false; io?.disconnect() }
  }, [moon.id])

  return (
    <div className="nv cpage">
      <header className="cbar">
        {onBack && <button className="btn sm" onClick={onBack}>← Moons</button>}
        <div className="cbar-t">
          <span className="eyebrow">{planetId} · Moon {moon.order}</span>
          <h1>Hashing</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef} />
      <AlgoChat planetId={planetId} moonId={moon.id} quickAnswers={QUICK_ANSWERS} suggested={SUGGESTED} reaction={reaction} />
    </div>
  )
}
