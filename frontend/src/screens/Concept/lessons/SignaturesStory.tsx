/**
 * Moon 4, "Digital signatures": a Story Scroll ported from the prototype (algoverse-prototype.html, Blockchain
 * LESSONS: "Uh-oh: anyone can write anything" through "What we've built so far").
 * Built like SharedLedgerStory (same scene, ledger and quiz from storyKit, same story.css), plus Back/Next
 * buttons under the scene and a quick check at the end. All the text lives here, so it works without the backend.
 */
import { useEffect, useRef, useState } from 'react'
import AlgoChat, { type Reaction } from '../AlgoChat'
import type { LessonProps } from '../StoryLayout'
import { NAMES, esc, makeQuiz, makeScene, navHTML, sha256, sleep, storyParts, type Line, type Name } from './storyKit'
import '../story.css'

const REAL = 'Alice pays Bob 20 · ID 1'
const FAKE = 'Alice pays Bob 100 · ID 2'

/** A random "signature" for Bob to guess with (same length as a real one) */
const randomSig = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')

export default function SignaturesStory({ planetId, moon, onBack, onComplete }: LessonProps) {
  const mainRef = useRef<HTMLElement>(null)
  const [reaction, setReaction] = useState<Reaction>({ text: "Remember Bob sneaking a fake line into the ledger? Today we stop him! Scroll down, and ask me anything on the way.", key: 0 })

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
      // Everyone's two keys, made up from their names like the prototype (the secret one is never shown, except for one peek)
      const SK = {} as Record<Name, string>, PK = {} as Record<Name, string>
      for (const n of NAMES) {
        SK[n] = (await sha256('secret key of ' + n)).slice(0, 16)
        PK[n] = (await sha256('public ' + SK[n])).slice(0, 16)
      }
      // signature = message + secret key
      const sign = async (msg: string, n: Name) => (await sha256(SK[n] + '|' + msg)).slice(0, 24)
      const realSig = await sign(REAL, 'Alice')
      if (!alive) return

      const st = {
        ledger: [{ f: 'Alice', t: 'Bob', a: 20 }, { f: 'Bob', t: 'Charlie', a: 40 }, { f: 'Charlie', t: 'Alice', a: 10 }] as Line[],
        forged: false,
        msg: REAL,
        signed: null as string | null,
        checked: false,
        guesses: 0,
        lastGuess: '',
        signedLines: [{ f: 'Alice', t: 'Bob', a: 20, sig: `ID 1 · sig ${realSig.slice(0, 12)}… ✓` }] as Line[],
        copyRule: false,
      }
      const forgedLine: Line = { f: 'Alice', t: 'Bob', a: 100, bad: 1, note: 'Alice never agreed to this!' }

      const SEC = [
        { h: 'Uh-oh: anyone can write anything', b: `<p>Remember the friends' shared ledger? There's a big hole in it. The ledger is public, so what stops <b>Bob</b> from writing <b>“Alice pays Bob 100”</b> without asking Alice?</p><button class="btn danger" id="s0forge">Let Bob sneak a line in</button><p class="fb bad" id="s0r" hidden></p><div class="kbox"><b>Key idea</b><span>We need a way to prove Alice really agreed. That's what this moon is about.</span></div><p class="down">Scroll down to keep going ↓</p>` },
        { h: 'Everyone gets two keys', b: `<p>Each person makes a pair of keys:</p><p><b class="sk">A secret key</b> that they keep hidden, like a password.<br><b class="pk">A public key</b> that they show to everyone.</p><table class="kt"><tr><th>Person</th><th>Secret key</th><th>Public key</th></tr>${NAMES.map((n) => `<tr><td class="who">${n}</td><td class="mono sk" data-sk="${n}">••••••••••••</td><td class="mono pk">${PK[n]}</td></tr>`).join('')}</table><button class="btn sm" id="s1peek">Peek at Alice's secret key</button><div class="kbox"><b>Key idea</b><span>The secret key makes signatures. The public key lets anyone check them.</span></div>` },
        { h: 'Signing a payment', b: `<p>To sign, Alice mixes the <b>message</b> with her <b>secret key</b> to get a signature.</p><p>Unlike a handwritten signature, a digital one is <b>different for every message</b>. Sign the payment, then edit the message and watch the signature change.</p><div class="inl"><input type="text" class="txt" id="s2m" aria-label="Message" value="${esc(st.msg)}"><button class="btn gold sm" id="s2sign">Sign with Alice's secret key</button></div><div class="sigout" id="s2sig" aria-live="polite">Not signed yet</div><div class="kbox"><b>Key idea</b><span>Signature = message + secret key. Change either one and the signature changes completely.</span></div>` },
        { h: 'Anyone can check it. Nobody can fake it.', b: `<p>Anyone can use Alice's <b class="pk">public key</b> to check a signature. It answers just <b>true</b> or <b>false</b>.</p><div class="pay"><b>${REAL}</b><div class="sigout">${realSig}</div><button class="btn sm" id="s3chk">Check with Alice's public key</button><p class="fb" id="s3r1" hidden></p></div><p>Now Bob wants to fake <b>“Alice pays Bob 100”</b>. Without Alice's secret key, all he can do is guess signatures.</p><div class="pay"><b>${FAKE}</b><div class="sigout" id="s3fs">No signature</div><div class="row"><button class="btn sm danger" id="s3g1">Guess once</button><button class="btn sm danger" id="s3g1000">Guess 1,000 times</button></div><p class="fb" id="s3r2" hidden></p></div><div class="kbox"><b>Key idea</b><span>There are 2<sup>256</sup> possible signatures, a number with 78 digits. Guessing the right one is hopeless.</span></div>` },
        { h: 'Stop the copy trick', b: `<p>Bob can't fake a new signature. But he could <b>copy</b> Alice's real signed line and paste it again, so she pays him twice.</p><p>Try it, and watch the ledger:</p><div class="inl"><button class="btn sm danger" id="s4copy">Bob copies the line</button><button class="btn sm gold" id="s4rule">Add the unique-ID rule</button></div><p class="fb" id="s4r" hidden></p><p>The fix: every payment includes a <b>unique ID</b>. A line whose ID has already been used gets rejected.</p><div class="kbox"><b>Key idea</b><span>Unique IDs mean each payment needs its own fresh signature, so copies are worthless.</span></div>` },
        { h: "What we've built so far", b: `<ul class="checkl"><li><span>A <b>shared ledger</b> of payments</span></li><li><span><b>No overspending</b>: the history is the money</span></li><li><span><b>Signatures</b>: only you can approve your payments</span></li><li><span><b>Unique IDs</b>: no copying lines</span></li></ul><p>One problem is left: someone still has to <b>host</b> the ledger, and we'd have to trust them. Next we'll fix that by chaining <b>blocks</b> together with the hashes you've already met.</p><div class="kbox"><b>Key idea</b><span>Signatures remove the need to trust each line. Next we remove the need to trust whoever keeps the list.</span></div><div id="s5q"></div><div class="donebar" id="s5done" hidden><button class="btn go" id="s5complete">Complete moon</button><span class="down">Next up: blocks.</span></div>` },
      ]
      main.innerHTML = `<div class="i1"><div class="i1-story"><div class="prog1"><i id="sp"></i></div>${SEC.map((s, i) => `<section class="sec" data-k="${i}"><span class="secn">Part ${i + 1} of ${SEC.length}</span><h2>${s.h}</h2>${s.b}</section>`).join('')}</div>
        <div class="i1-stage"><div id="sscene"></div><p class="i1-cap" id="scap"></p>
          ${navHTML}</div></div>`
      const sc = makeScene($('sscene'))
      let active = -1
      const cap = (t: string) => ($('scap').textContent = t)

      // what the paper card in the scene shows for parts 3 and 4
      const showSigning = () => sc.paper('Alice signs', `<div class="pl">${esc(st.msg) || '…'}</div><div class="pl">+ Alice's <b class="sk">secret key</b></div><div class="pl">= <span class="mono">${st.signed ?? '?'}</span></div>`)
      const showChecking = () => sc.paper("Checking with Alice's public key", `<div class="pl">${REAL}<br><span class="mono">${realSig}</span><br>${st.checked ? '<span class="vok">✓ True</span>' : 'Not checked yet'}</div><div class="pl">${FAKE}<br><span class="mono">${st.lastGuess || 'No signature'}</span><br>${st.guesses ? `<span class="vbad">✗ False</span> · ${st.guesses.toLocaleString()} guesses` : 'Bob is thinking…'}</div>`)
      const showLedger = () => sc.lines(st.ledger.concat(st.forged ? [forgedLine] : []), st.forged ? st.ledger.length : null)

      const apply = (k: number) => {
        if (k === active) return
        active = k; sc.hush(); sc.hl(null)
        main.querySelectorAll<HTMLElement>('.sec').forEach((s) => s.classList.toggle('on', +s.dataset.k! === k))
        $('sp').style.width = ((k + 1) / SEC.length) * 100 + '%'
        $('spart').textContent = `Part ${k + 1} of ${SEC.length}`
        $<HTMLButtonElement>('sback').disabled = k === 0
        $<HTMLButtonElement>('snext').disabled = k === SEC.length - 1
        sc.keys(k > 0)
        if (k === 0) { showLedger(); sc.hl('Bob'); cap('Bob is looking at that ledger…') }
        if (k === 1) {
          sc.hideBook(); cap('Everyone has a secret key (gold) and a public key (blue).')
          ;(async () => {
            for (const n of NAMES) { if (!alive || active !== 1) return; sc.glowKey(n, 's'); sc.glowKey(n, 'p'); await sleep(500) }
          })()
        }
        if (k === 2) { showSigning(); sc.hl('Alice'); cap('Message + secret key = signature.') }
        if (k === 3) { showChecking(); sc.hl('Bob'); cap("Anyone can check. Only Alice's secret key can sign.") }
        if (k === 4) { sc.lines(st.signedLines); sc.hl('Bob'); cap(st.copyRule ? 'Each ID can only be used once.' : 'A real, signed payment from Alice…') }
        if (k === 5) { sc.lines(st.signedLines); cap('Signed, one-of-a-kind payments only.') }
      }

      parts = storyParts(main, apply)
      apply(0)

      // Back/Next: scroll the story to the previous/next part (the observer then updates everything else)
      $('sback').onclick = () => parts?.go(-1)
      $('snext').onclick = () => parts?.go(1)

      // Part 1: Bob forges a line
      $<HTMLButtonElement>('s0forge').onclick = () => {
        if (st.forged) return
        st.forged = true; $<HTMLButtonElement>('s0forge').disabled = true
        showLedger(); sc.coin('Alice', 'Bob', true); sc.shake('Bob'); sc.say('Bob', 'Heh heh…', 1800)
        setTimeout(() => alive && sc.say('Alice', 'I never agreed to that!', 2600), 900)
        const r = $('s0r'); r.hidden = false; r.textContent = 'Nothing stopped Bob. His fake line looks just as real as the others.'
        algoSay("Uh-oh. Nothing in our system stopped Bob! Let's fix that.")
      }

      // Part 2: peek at Alice's secret key
      $('s1peek').onclick = () => {
        ($('s1peek').closest('section')!.querySelector('[data-sk="Alice"]') as HTMLElement).textContent = SK.Alice
        sc.glowKey('Alice', 's'); sc.say('Alice', "Hey, that's private!", 1800)
        algoSay('Shh. In real life, Alice never shows this to anyone.')
      }

      // Part 3: sign, then edit the message and watch the signature change
      let signRun = 0
      const resign = async () => {
        const run = ++signRun
        const sig = await sign(st.msg, 'Alice')
        if (!alive || run !== signRun) return
        st.signed = sig
        const out = $('s2sig'); out.textContent = sig
        out.classList.remove('fresh'); void out.offsetWidth; out.classList.add('fresh')
        if (active === 2) showSigning()
      }
      $<HTMLInputElement>('s2m').oninput = (e) => {
        st.msg = (e.target as HTMLInputElement).value
        if (st.signed) resign()
        else if (active === 2) showSigning()
      }
      $('s2sign').onclick = () => {
        const first = !st.signed
        resign(); sc.glowKey('Alice', 's'); sc.coin('Alice', 'book')
        if (first) algoSay('Signed! Now change the message, even one letter, and watch the signature.')
      }

      // Part 4: check the real signature, and let Bob guess at a fake one
      $('s3chk').onclick = () => {
        st.checked = true
        const r = $('s3r1'); r.hidden = false; r.className = 'fb ok'; r.textContent = "✓ True. Only Alice's secret key could have made this."
        sc.glowKey('Alice', 'p')
        if (active === 3) showChecking()
      }
      const guess = (n: number) => {
        st.lastGuess = randomSig() // one of 2²⁵⁶: it never matches, so every guess is checked as false
        st.guesses += n
        $('s3fs').textContent = st.lastGuess
        const r = $('s3r2'); r.hidden = false; r.className = 'fb bad'; r.textContent = `✗ False. ${st.guesses.toLocaleString()} guesses so far, all wrong.`
        sc.shake('Bob'); sc.glowKey('Alice', 'p')
        if (active === 3) showChecking()
        if (n > 1) algoSay("A thousand guesses, zero luck. Even a billion wouldn't help!")
      }
      $('s3g1').onclick = () => guess(1)
      $('s3g1000').onclick = () => guess(1000)

      // Part 5: the copy trick, and the unique-ID rule that stops it
      const copyResult = (cls: string, text: string) => { const r = $('s4r'); r.hidden = false; r.className = 'fb ' + cls; r.textContent = text }
      $('s4copy').onclick = () => {
        if (st.copyRule) {
          sc.shake('Bob'); sc.say('Bob', 'Foiled!', 1500)
          copyResult('ok', 'Rejected: ID 1 has already been used.')
          return
        }
        st.signedLines.push({ ...st.signedLines[0], bad: 1, note: 'A copy. Alice pays twice!' })
        sc.lines(st.signedLines, st.signedLines.length - 1); sc.coin('Alice', 'Bob', true); sc.say('Bob', 'Ka-ching!', 1500)
        copyResult('bad', 'Accepted! The signature is valid, so the copy got through.')
        algoSay('The signature is real, so the copy looks fine. Sneaky! Try the unique-ID rule.')
      }
      $<HTMLButtonElement>('s4rule').onclick = () => {
        st.copyRule = true; $<HTMLButtonElement>('s4rule').disabled = true
        st.signedLines = st.signedLines.filter((l) => !l.bad)
        sc.lines(st.signedLines); cap('Each ID can only be used once.')
        copyResult('ok', 'Rule added. The copies were removed because their ID was already used.')
        algoSay('Now try copying again!')
      }

      // Part 6: quick check, then complete the moon
      quiz($('s5q'), 'Quick check: Bob wants to add “Alice pays Bob 100”. What stops him now?', [
        ["He can't make Alice's signature without her secret key", true, "Exactly. Only Alice's secret key can sign for her, and anyone can check it with her public key."],
        ["He can't see Alice's public key", false, "Everyone can see public keys. That's what lets anyone check a signature."],
        ['He can copy one of her old signatures', false, 'Not any more. Every payment has a unique ID, so a copied line gets rejected.'],
      ], () => { $('s5done').hidden = false })
      $('s5complete').onclick = () => complete.current?.(moon.id)
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
          <h1>Digital signatures</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef} />
      <AlgoChat planetId={planetId} moonId={moon.id} reaction={reaction} />
    </div>
  )
}
