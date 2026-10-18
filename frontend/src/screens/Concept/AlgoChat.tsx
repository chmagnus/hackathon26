/**
 * Algo, the alien guide, as a chat bubble in the bottom-right corner.
 *  - Pops up short comments in a speech bubble (like Nib did in the prototype).
 *  - Click Algo to open a chat bubble: suggested questions + ask your own (answered by the AI tutor).
 */
import { useEffect, useRef, useState } from 'react'
import Algo, { type AlgoMood } from './Algo'
import { streamTutor, typeOut, type ChatMessage } from './tutorApi'
import { playAlgoClick, startAlgoVoice, stopAlgoVoice } from '../../shared/sounds'

export type Reaction = { text: string; key: number }

type AlgoChatProps = {
  planetId: string // e.g. "blockchain"
  moonId: string // e.g. "ledgers"
  /** Question chips sent to the AI tutor */
  suggested?: string[]
  /** Question chips with pre-written answers (instant, no AI needed) */
  quickAnswers?: [question: string, answer: string][]
  /** Short comment for Algo to pop up. Change `key` to show a new one. */
  reaction?: Reaction
  onMoonLink?: (moonId: string) => void
}

const FALLBACK = "Hmm, my signal's weak right now. Try one of the suggested questions, or ask me again in a moment!"
const HAPPY_MS = 1500 // how long Algo looks pleased after finishing an answer

export default function AlgoChat({ planetId, moonId, suggested = [], quickAnswers = [], reaction, onMoonLink }: AlgoChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Reaction bubble: Algo talks for a moment, the bubble hides after 9 seconds
  const [quietKey, setQuietKey] = useState<number | null>(null)
  const [hiddenKey, setHiddenKey] = useState<number | null>(null)
  useEffect(() => {
    if (!reaction) return
    const t1 = setTimeout(() => setQuietKey(reaction.key), 1600)
    const t2 = setTimeout(() => setHiddenKey(reaction.key), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [reaction])
  const showReaction = !!reaction && !open && hiddenKey !== reaction.key
  const reacting = !!reaction && quietKey !== reaction.key

  // New moon = fresh chat
  const [chatMoon, setChatMoon] = useState(moonId)
  if (chatMoon !== moonId) {
    setChatMoon(moonId)
    setMessages([])
    setStreaming(false)
  }
  useEffect(() => () => { abortRef.current?.abort(); stopAlgoVoice() }, [moonId])

  // Algo looks happy for a moment after finishing an answer
  const [happy, setHappy] = useState(false)
  const happyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(happyTimer.current), [])
  function celebrate() {
    setHappy(true)
    clearTimeout(happyTimer.current)
    happyTimer.current = setTimeout(() => setHappy(false), HAPPY_MS)
  }

  // Keep the newest message in view
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, open])

  async function send(text: string, preset?: string) {
    const question = text.trim()
    if (!question || streaming) return

    const history: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    // Adds each piece onto the last (assistant) message; Algo's voice plays while he answers
    let voiceStarted = false
    const append = (piece: string) => {
      if (!voiceStarted) { voiceStarted = true; startAlgoVoice() }
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, content: last.content + piece }
        return next
      })
    }

    let answered = false
    try {
      if (preset) await typeOut(preset, append, abort.signal)
      else await streamTutor({ system: planetId, moon_id: moonId, messages: history }, append, abort.signal)
      answered = true
    } catch {
      if (abort.signal.aborted) return
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: FALLBACK }])
    } finally {
      if (!abort.signal.aborted) {
        stopAlgoVoice()
        setStreaming(false)
        if (answered) celebrate()
      }
    }
  }

  function toggle() {
    playAlgoClick()
    if (open) {
      abortRef.current?.abort()
      stopAlgoVoice()
      setStreaming(false)
    }
    setOpen(!open)
  }

  const waiting = streaming && messages[messages.length - 1]?.content === ''
  // thinking until the first word arrives, talking while it streams (or while he pops up a comment), then happy for a moment
  const mood: AlgoMood = waiting ? 'thinking'
    : streaming || (reacting && !open) ? 'talking'
    : happy ? 'happy'
    : 'idle'
  const chips: { q: string; a?: string }[] = [...quickAnswers.map(([q, a]) => ({ q, a })), ...suggested.map((q) => ({ q }))]

  return (
    <>
      {/* Speech bubble with Algo's latest comment */}
      {showReaction && (
        <div
          key={reaction.key}
          role="status"
          className="fixed right-[112px] bottom-12 z-40 max-w-[320px] rounded-2xl rounded-br-sm border border-mint/40 bg-[#0b1427] px-4 py-3 text-[15px] leading-snug text-ink shadow-2xl"
          style={{ animation: 'algo-pop .3s ease-out' }}
        >
          {reaction.text}
          <button onClick={() => setHiddenKey(reaction.key)} aria-label="Hide" className="ml-2 text-muted cursor-pointer hover:text-ink">×</button>
        </div>
      )}

      {/* The chat bubble */}
      {open && (
        <section
          aria-label="Chat with Algo"
          className="fixed right-5 bottom-[118px] z-40 flex h-[min(400px,60vh)] w-[320px] flex-col max-sm:left-3 max-sm:right-3 max-sm:w-auto overflow-hidden rounded-3xl rounded-br-md border border-white/10 bg-[#070b18] shadow-2xl"
          style={{ animation: 'algo-pop .25s ease-out' }}
        >
          <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-wide">Algo</p>
              <p className="text-[13px] text-muted">{waiting ? 'Thinking…' : 'Your alien guide. Ask me anything about this lesson.'}</p>
            </div>
            <button onClick={toggle} aria-label="Close chat" className="ml-auto self-start text-2xl leading-none text-muted cursor-pointer hover:text-ink">×</button>
          </header>

          <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="px-2 py-4 text-center text-[14px] text-muted">Stuck on something? Ask me. I'll explain it in plain words.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${
                  m.role === 'user' ? 'self-end rounded-br-sm bg-sky/20' : 'self-start rounded-bl-sm border border-white/10 bg-white/5'
                }`}
              >
                {m.content === '' ? <span className="italic text-muted">Algo is thinking…</span> : <MessageText text={m.content} onMoonLink={onMoonLink} />}
              </div>
            ))}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {chips.map((c) => (
                <button
                  key={c.q}
                  onClick={() => send(c.q, c.a)}
                  disabled={streaming}
                  className="rounded-full border border-sky/40 bg-sky/10 px-3 py-1.5 text-left text-[12.5px] font-bold text-sky cursor-pointer hover:bg-sky/20 disabled:opacity-50"
                >
                  {c.q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 border-t border-white/10 px-4 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Algo about this lesson…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-[14.5px] text-ink placeholder:text-muted focus:border-mint focus:outline-none"
            />
            <button type="submit" disabled={!input.trim() || streaming} className="rounded-xl bg-mint px-4 font-bold text-void cursor-pointer disabled:opacity-40">
              Ask
            </button>
          </form>
        </section>
      )}

      {/* Algo himself */}
      <button
        onClick={toggle}
        aria-label={open ? 'Close chat with Algo' : 'Chat with Algo'}
        className="fixed right-5 bottom-5 z-40 grid h-[84px] w-[84px] place-items-center rounded-full border border-mint/40 bg-[#0b1427] shadow-[0_10px_40px_rgba(0,0,0,.5),0_0_24px_rgba(111,242,197,.18)] cursor-pointer transition-transform hover:scale-105"
      >
        <span className="block h-[62px] w-[62px]"><Algo mood={mood} /></span>
      </button>

      <style>{`@keyframes algo-pop { from { transform: translateY(8px) scale(.96); opacity: 0 } }`}</style>
    </>
  )
}

/** Shows message text, turning [[moon-id]] into clickable buttons. */
function MessageText({ text, onMoonLink }: { text: string; onMoonLink?: (id: string) => void }) {
  const parts = text.split(/\[\[([a-z0-9-]+)\]\]/g) // odd indexes are moon ids
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? part : (
          <button key={i} onClick={() => onMoonLink?.(part)} className="mx-0.5 inline rounded-full border border-gold/50 px-2 text-xs text-gold cursor-pointer hover:bg-gold/10">
            🌙 {part.replace(/-/g, ' ')}
          </button>
        ),
      )}
    </>
  )
}
