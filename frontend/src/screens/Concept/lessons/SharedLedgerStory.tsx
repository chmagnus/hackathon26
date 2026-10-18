/**
 * Moon 1, "A shared ledger": the Story Scroll, ported straight from the prototype (algoverse2.html, idea1).
 * Only differences from the prototype: Algo (new design, chat bubble instead of Nib's side panel) and sounds.
 * The scene and story are built with plain DOM like the prototype, inside a React-owned container.
 */
import { useEffect, useRef, useState } from 'react'
import AlgoChat, { type Reaction } from '../AlgoChat'
import type { LessonProps } from '../StoryLayout'
import { NAMES, balances, makeQuiz, makeScene, selP, sleep, type Line, type Name } from './storyKit'
import '../story.css'

/** Nib's pre-written answers from the prototype, now Algo's */
const QUICK_ANSWERS: [string, string][] = [
  ["What's a ledger?", 'A ledger is just a list of payments: who paid whom, and how much. Think of a shared note that says “Alice paid Bob 20”. Nobody hands over cash until you settle up.'],
  ['Why not just use cash?', "You could! But swapping cash after every pizza gets annoying. Writing it down means you only pay once a month, and it's the first step towards money that's completely digital."],
  ['What does settling up mean?', "It's when everyone adds up what they paid and what they received. Paid out more? You put the difference in a pot. Received more? You take it out. Then everyone's even."],
  ['Why does everyone start with 100?', "So nobody can spend money they don't have. If Charlie only has 20 left on the ledger, a payment of 40 gets rejected. That's what turns the list itself into money."],
  ["Can't Bob just cheat?", 'Right now, yes! Nothing proves Alice agreed to a line Bob writes. That\'s exactly what Moon 2 fixes with digital signatures.'],
]

export default function SharedLedgerStory({ planetId, moon, onBack, onComplete }: LessonProps) {
  const mainRef = useRef<HTMLElement>(null)
  const [reaction, setReaction] = useState<Reaction>({ text: "Scroll down and I'll walk you through it. Ask me anything on the way!", key: 0 })

  // Keep the latest callbacks without re-running the setup
  const say = useRef((text: string) => setReaction({ text, key: Date.now() }))
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete })

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const algoSay = (t: string) => say.current(t)
    let alive = true

    const $ = <T extends HTMLElement = HTMLElement>(id: string) => main.querySelector(`#${id}`) as T
    const quiz = makeQuiz(algoSay)

    const st = {
      iou: [{ f: 'Alice', t: 'Bob', a: 20 }, { f: 'Bob', t: 'Charlie', a: 40 }] as Line[],
      money: [{ sys: 1, t: 'Alice', a: 100 }, { sys: 1, t: 'Bob', a: 100 }, { sys: 1, t: 'Charlie', a: 100 }, { f: 'Charlie', t: 'Alice', a: 50 }, { f: 'Charlie', t: 'Bob', a: 30 }] as Line[],
      forged: false,
      settled: false,
    }
    const SEC = [
      { h: 'Three friends, lots of IOUs', b: `<p>Meet <b>Alice</b>, <b>Bob</b> and <b>Charlie</b>. They're always paying for each other: pizza, cinema tickets, taxi rides.</p><p>Watch how often money moves between them. Handing cash back every single time gets annoying fast.</p><p class="down">Scroll down to keep going ↓</p>` },
      { h: 'Write it down instead', b: `<p>So they try something smarter: instead of paying straight away, they <b>write every payment on one shared list</b>. That list is called a <b>ledger</b>.</p><div class="kbox"><b>Key idea</b><span>A ledger is just a list of who paid whom.</span></div><p>Try changing a line in the ledger:</p><div class="inl">Alice pays Bob <select id="i1amt" aria-label="Amount"><option>5</option><option selected>20</option><option>50</option></select> coins</div>` },
      { h: 'Anyone can add a line', b: `<p>The ledger lives somewhere everyone can see, like a shared web page. <b>Anyone can add a line.</b> Add one yourself:</p><div class="inl">${selP('i1f', 'Charlie')} pays ${selP('i1t', 'Alice')} <select id="i1a" aria-label="Amount"><option>5</option><option selected>10</option><option>30</option></select><button class="btn gold sm" id="i1add">Add line</button></div>` },
      { h: 'Settle up at the end of the month', b: `<p>Once a month they <b>settle up</b>. Everyone adds up what they paid out and what they received.</p><p>Paid out more than you got? You put the difference <b>into a pot</b>. Got more? You <b>take it out</b>. Then everyone's even.</p><button class="btn gold" id="i1settle">Settle up the month</button><div id="i1sq" style="margin-top:14px"></div>` },
      { h: 'Make the list the money', b: `<p>What if Charlie racks up a huge debt and never shows up? New rules: <b>everyone starts with 100</b> on the ledger, and <b>you can't spend more than you have</b>.</p><p>Charlie has already paid out 80, so he has 20 left. Try it:</p><div class="inl">Charlie pays Bob <select id="i1c" aria-label="Amount"><option>10</option><option>20</option><option selected>40</option></select><button class="btn gold sm" id="i1try">Try payment</button></div><p class="fb" id="i1cr" hidden></p><div class="kbox"><b>Key idea</b><span>Now the list itself is the money. To check any payment, you need the whole history.</span></div>` },
      { h: 'The hole in our plan', b: `<p>There's still a big problem. The ledger is public, so what stops <b>Bob</b> from writing <b>“Alice pays Bob 100”</b> without asking her?</p><button class="btn danger" id="i1forge">Let Bob sneak a line in</button><div id="i1q" style="margin-top:16px"></div><div class="donebar" id="i1done" hidden><button class="btn go" id="i1complete">Complete moon 1</button><span class="down">Next up: digital signatures.</span></div>` },
    ]
    main.innerHTML = `<div class="i1"><div class="i1-story"><div class="prog1"><i id="i1p"></i></div>${SEC.map((s, i) => `<section class="sec" data-k="${i}"><span class="secn">Part ${i + 1} of ${SEC.length}</span><h2>${s.h}</h2>${s.b}</section>`).join('')}</div>
      <div class="i1-stage"><div id="i1scene"></div><p class="i1-cap" id="i1cap"></p></div></div>`
    const sc = makeScene($('i1scene'))
    let active = -1
    const cap = (t: string) => ($('i1cap').textContent = t)
    const forgedLine: Line = { f: 'Alice', t: 'Bob', a: 100, bad: 1, note: 'Alice never agreed to this!' }

    const showSettle = () => {
      const b = balances(st.iou); sc.bal(b, true)
      const pot = NAMES.reduce((s, n) => s + (b[n] < 0 ? -b[n] : 0), 0); sc.pot(pot)
      cap(NAMES.filter((n) => b[n] < 0).map((n) => `${n} puts ${-b[n]} in`).join(', ') + (NAMES.some((n) => b[n] > 0) ? '. ' + NAMES.filter((n) => b[n] > 0).map((n) => `${n} takes ${b[n]} out`).join(', ') : '') + '.')
    }

    const apply = (k: number) => {
      if (k === active) return
      active = k; sc.hush(); sc.hl(null); sc.pot(null)
      main.querySelectorAll<HTMLElement>('.sec').forEach((s) => s.classList.toggle('on', +s.dataset.k! === k))
      $('i1p').style.width = ((k + 1) / SEC.length) * 100 + '%'
      if (k === 0) {
        sc.hideBook(); sc.bal(null); cap('Money moves all the time…')
        ;(async () => {
          const seq: [Name, Name, string][] = [['Alice', 'Bob', "Pizza's on me!"], ['Bob', 'Charlie', 'Got the tickets!'], ['Charlie', 'Alice', "Taxi's paid!"], ['Bob', 'Alice', "Here's for lunch!"]]
          for (const [a, b, t] of seq) { if (!alive || active !== 0) return; sc.coin(a, b); sc.say(a, t, 1500); await sleep(1100) }
        })()
      }
      if (k === 1 || k === 2) { sc.bal(null); sc.lines(st.iou); cap('Every payment goes on the list.') }
      if (k === 3) { sc.lines(st.iou); if (st.settled) showSettle(); else { sc.bal(null); cap('Who owes the pot?') } }
      if (k === 4) { sc.lines(st.money); sc.bal(balances(st.money)); cap('Balances, worked out from the whole history.') }
      if (k === 5) { sc.lines(st.money.concat(st.forged ? [forgedLine] : []), st.forged ? st.money.length : null); sc.bal(balances(st.money)); sc.hl('Bob'); cap('Bob is looking at that ledger…') }
    }

    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) apply(+(e.target as HTMLElement).dataset.k!) }), { root: main, rootMargin: '-35% 0px -55% 0px' })
    main.querySelectorAll('.sec').forEach((s) => io.observe(s))
    apply(0)

    $<HTMLSelectElement>('i1amt').onchange = (e) => { st.iou[0].a = +(e.target as HTMLSelectElement).value; sc.lines(st.iou, 0); sc.coin('Alice', 'Bob') }
    $('i1add').onclick = () => {
      const f = $<HTMLSelectElement>('i1f').value as Name, t = $<HTMLSelectElement>('i1t').value as Name, a = +$<HTMLSelectElement>('i1a').value
      if (f === t) { algoSay("Pick two different people. Paying yourself doesn't count!"); return }
      st.iou.push({ f, t, a }); st.settled = false; sc.lines(st.iou, st.iou.length - 1); sc.coin(f, t); sc.say(f, 'Added!', 1200)
      algoSay(`Nice! “${f} pays ${t} ${a}” is on the ledger now.`)
    }
    $('i1settle').onclick = () => {
      st.settled = true; showSettle()
      NAMES.forEach((n) => { if (balances(st.iou)[n] < 0) sc.coin(n, 'pot') })
      const b = balances(st.iou), payer = NAMES.slice().sort((x, y) => b[x] - b[y])[0]
      quiz($('i1sq'), `Quick check: ${payer} has ${b[payer]}. What happens to ${payer} when they settle up?`, [
        [`${payer} puts ${-b[payer]} into the pot`, true, `Right. ${payer} paid out more than they received, so they put the difference in.`],
        [`${payer} takes ${-b[payer]} out of the pot`, false, 'A minus balance means they paid out more than they got, so they owe the pot.'],
        ['Nothing happens', false, "Their balance isn't zero, so they have to even up with the pot."],
      ])
    }
    $('i1try').onclick = () => {
      const a = +$<HTMLSelectElement>('i1c').value, have = balances(st.money).Charlie, r = $('i1cr')
      r.hidden = false
      if (a > have) {
        r.className = 'fb bad'; r.textContent = `Rejected. Charlie only has ${have} on the ledger, so he can't pay ${a}.`
        sc.shake('Charlie'); sc.coin('Charlie', 'Bob', true); sc.say('Charlie', 'Declined!?', 1500)
        algoSay("See? The ledger blocked it. You can't spend money you don't have.")
      } else {
        st.money.push({ f: 'Charlie', t: 'Bob', a }); r.className = 'fb ok'; r.textContent = `Accepted. Charlie had ${have}, now he has ${have - a}.`
        sc.lines(st.money, st.money.length - 1); sc.bal(balances(st.money)); sc.coin('Charlie', 'Bob')
      }
    }
    $<HTMLButtonElement>('i1forge').onclick = () => {
      if (st.forged) return
      st.forged = true; $<HTMLButtonElement>('i1forge').disabled = true
      sc.lines(st.money.concat([forgedLine]), st.money.length); sc.coin('Alice', 'Bob', true); sc.shake('Bob'); sc.say('Bob', 'Heh heh…', 1800)
      setTimeout(() => alive && sc.say('Alice', 'I never agreed to that!', 2600), 900)
      algoSay('Uh-oh. Nothing in our system stopped Bob!')
      quiz($('i1q'), "What's missing from our system?", [
        ['A way to prove Alice really agreed to a payment', true, "Exactly. That's what digital signatures do, and it's the next moon."],
        ['A bigger ledger', false, "Size isn't the problem. Bob could still write fake lines."],
        ['More friends', false, 'More people would just mean more people who could cheat.'],
      ], () => { $('i1done').hidden = false })
    }
    $('i1complete').onclick = () => complete.current?.(moon.id)

    return () => { alive = false; io.disconnect() }
  }, [moon.id])

  return (
    <div className="nv cpage">
      <header className="cbar">
        {onBack && <button className="btn sm" onClick={onBack}>← Moons</button>}
        <div className="cbar-t">
          <span className="eyebrow">{planetId} · Moon {moon.order}</span>
          <h1>A shared ledger</h1>
        </div>
      </header>
      <main className="cmain" ref={mainRef} />
      <AlgoChat planetId={planetId} moonId={moon.id} quickAnswers={QUICK_ANSWERS} reaction={reaction} />
    </div>
  )
}
