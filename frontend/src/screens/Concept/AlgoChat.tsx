/**
 * Algo, the alien guide, as a chat bubble in the bottom-right corner.
 * Click Algo to open a chat box and ask questions about the lesson (answered by the AI tutor).
 * He only speaks when asked.
 */
import { useEffect, useRef, useState } from 'react'
import Algo, { type AlgoMood } from './Algo'
import { streamTutor, TutorError, type ChatMessage } from './tutorApi'
import { playAlgoClick, startAlgoVoice, stopAlgoVoice } from '../../shared/sounds'

type AlgoChatProps = {
  planetId: string // e.g. "blockchain"
  moonId: string // e.g. "ledgers"
  onMoonLink?: (moonId: string) => void
}

const FALLBACK = "Hmm, my signal's weak right now. Ask me again in a moment!"
const HAPPY_MS = 1500 // how long Algo looks pleased after finishing an answer

export default function AlgoChat({ planetId, moonId, onMoonLink }: AlgoChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  async function send(text: string) {
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
      await streamTutor({ system: planetId, moon_id: moonId, messages: history }, append, abort.signal)
      answered = true
    } catch (e) {
      if (abort.signal.aborted) return
      // the backend's own explanation (e.g. today's limit is reached) if it gave one
      const reply = e instanceof TutorError ? e.message : FALLBACK
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: reply }])
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
  // thinking until the first word arrives, talking while it streams, then happy for a moment
  const mood: AlgoMood = waiting ? 'thinking'
    : streaming ? 'talking'
    : happy ? 'happy'
    : 'idle'

  return (
    <>
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
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${
                  m.role === 'user' ? 'self-end rounded-br-sm bg-sky/20' : 'self-start rounded-bl-sm border border-white/10 bg-white/5'
                }`}
              >
                {m.content === '' ? <span className="italic text-muted">Algo is thinking…</span> : <MessageText text={m.content} onMoonLink={onMoonLink} />}
              </div>
            ))}
          </div>

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
