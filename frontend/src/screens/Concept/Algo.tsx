// Algo the alien. Use <Algo /> for idle, or <Algo mood="thinking" | "talking" | "happy" />.
//  - idle: antennae sway gently. thinking: antenna tips pulse. talking: mouth moves. happy: blushes and wiggles his antennae.
//  - Blinks every few seconds, and his eyes follow the mouse.
//  - With "reduce motion" turned on in the system settings, Algo stays still.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

export type AlgoMood = 'idle' | 'thinking' | 'talking' | 'happy'

const css = `
.algo .ant { transform-box: view-box; }
.algo .ant-l { transform-origin: 38px 30px; }
.algo .ant-r { transform-origin: 62px 30px; }
.algo.idle .ant { animation: algo-sway 3s ease-in-out infinite; }
.algo.idle .ant-r { animation-delay: -1.5s; }
.algo .tip { transform-box: fill-box; transform-origin: center; }
.algo.thinking .tip { animation: algo-pulse .9s ease-in-out infinite; }
.algo.thinking .ant-r .tip { animation-delay: -.45s; }
.algo.happy .ant { animation: algo-wiggle .22s ease-in-out infinite alternate; }
.algo.happy .ant-r { animation-direction: alternate-reverse; }
.algo .blush { opacity: 0; transition: opacity .3s; }
.algo.happy .blush { opacity: .75; }
.algo .look { transition: transform .15s ease-out; }
.algo .lid { transform-box: fill-box; transform-origin: center; transition: transform .07s; }
.algo.blink .lid { transform: scaleY(.1); }
.algo .mouth { display: none; }
.algo.talking .smile { display: none; }
.algo.talking .mouth { display: inline; transform-box: fill-box; transform-origin: center; animation: algo-talk .2s infinite alternate; }
@keyframes algo-talk { to { transform: scaleY(.3); } }
@keyframes algo-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
@keyframes algo-pulse { 50% { transform: scale(1.5); fill: #fff3c4; } }
@keyframes algo-wiggle { from { transform: rotate(-12deg); } to { transform: rotate(12deg); } }
@media (prefers-reduced-motion: reduce) { .algo, .algo * { animation: none !important; transition: none !important; } }
`

// Follows the system "reduce motion" setting, live
const REDUCED = '(prefers-reduced-motion: reduce)'
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const prefersReduced = () => window.matchMedia(REDUCED).matches

const LOOK = 3 // how far the eyes move towards the mouse (in the drawing's units)

export default function Algo({ mood = 'idle' }: { mood?: AlgoMood }) {
  const reduced = useSyncExternalStore(subscribeReduced, prefersReduced)
  const svgRef = useRef<SVGSVGElement>(null)
  const lookRef = useRef<SVGGElement>(null)

  // Blink on a random timer (every 2 to 6 seconds)
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    if (reduced) return
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        setBlink(true)
        timer = setTimeout(() => { setBlink(false); next() }, 140)
      }, 2000 + Math.random() * 4000)
    }
    next()
    return () => clearTimeout(timer)
  }, [reduced])

  // Eyes follow the mouse (at most once per frame, without re-rendering)
  useEffect(() => {
    const look = lookRef.current
    if (reduced || !look) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = svgRef.current?.getBoundingClientRect()
        if (!box?.width) return
        // from between Algo's eyes to the pointer; the eyes go further the further away it is
        const dx = e.clientX - (box.left + box.width / 2)
        const dy = e.clientY - (box.top + box.height * 0.53)
        const dist = Math.hypot(dx, dy) || 1
        const reach = LOOK * Math.min(1, dist / 150)
        look.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach}px)`
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
      look.style.transform = ''
    }
  }, [reduced])

  return (
    <svg ref={svgRef} className={`algo ${mood} ${blink && !reduced ? 'blink' : ''}`} viewBox="0 0 100 110" width="100%" height="100%" aria-hidden="true">
      <style>{css}</style>

      {/* antennae */}
      <g className="ant ant-l">
        <path d="M38 30 Q32 18 26 10" stroke="#3fc79c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle className="tip" cx="26" cy="10" r="5" fill="#ffcf5a" />
      </g>
      <g className="ant ant-r">
        <path d="M62 30 Q68 18 74 10" stroke="#3fc79c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle className="tip" cx="74" cy="10" r="5" fill="#ffcf5a" />
      </g>

      {/* head */}
      <circle cx="50" cy="64" r="42" fill="#6ff2c5" />

      {/* blush (shows when happy) */}
      <ellipse className="blush" cx="24" cy="76" rx="7" ry="4" fill="#ff5c8a" />
      <ellipse className="blush" cx="76" cy="76" rx="7" ry="4" fill="#ff5c8a" />

      {/* eyes: the whole group looks towards the mouse, each eye blinks */}
      <g ref={lookRef} className="look">
        <g className="lid">
          <ellipse cx="36" cy="58" rx="9" ry="13" fill="#141a33" />
          <circle cx="39" cy="53" r="3.5" fill="#fff" />
        </g>
        <g className="lid">
          <ellipse cx="64" cy="58" rx="9" ry="13" fill="#141a33" />
          <circle cx="67" cy="53" r="3.5" fill="#fff" />
        </g>
      </g>

      {/* mouth: smile normally, moving "o" when talking */}
      <path className="smile" d="M40 82 Q50 90 60 82" stroke="#141a33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse className="mouth" cx="50" cy="85" rx="6" ry="5" fill="#141a33" />
    </svg>
  )
}
