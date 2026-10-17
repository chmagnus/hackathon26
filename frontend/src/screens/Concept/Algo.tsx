// Algo the alien. Use <Algo /> to smile, <Algo talking /> to talk.

const css = `
.algo .mouth { display: none; }
.algo.talking .smile { display: none; }
.algo.talking .mouth { display: inline; transform-box: fill-box; transform-origin: center; animation: algo-talk .2s infinite alternate; }
@keyframes algo-talk { to { transform: scaleY(.3); } }
`

export default function Algo({ talking = false }: { talking?: boolean }) {
  return (
    <svg className={`algo ${talking ? 'talking' : ''}`} viewBox="0 0 100 110" width="100%" height="100%" aria-hidden="true">
      <style>{css}</style>

      {/* antennae */}
      <path d="M38 30 Q32 18 26 10" stroke="#3fc79c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M62 30 Q68 18 74 10" stroke="#3fc79c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="26" cy="10" r="5" fill="#ffcf5a" />
      <circle cx="74" cy="10" r="5" fill="#ffcf5a" />

      {/* head */}
      <circle cx="50" cy="64" r="42" fill="#6ff2c5" />

      {/* eyes */}
      <ellipse cx="36" cy="58" rx="9" ry="13" fill="#141a33" />
      <ellipse cx="64" cy="58" rx="9" ry="13" fill="#141a33" />
      <circle cx="39" cy="53" r="3.5" fill="#fff" />
      <circle cx="67" cy="53" r="3.5" fill="#fff" />

      {/* mouth: smile normally, moving "o" when talking */}
      <path className="smile" d="M40 82 Q50 90 60 82" stroke="#141a33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse className="mouth" cx="50" cy="85" rx="6" ry="5" fill="#141a33" />
    </svg>
  )
}