import { useEffect, useRef, useState } from 'react'
import Algo from './Algo'
import { streamTutor, type ChatMessage } from './tutorApi'
import { playAlgoClick, startAlgoVoice, stopAlgoVoice } from '../../shared/sounds'

type AlgoChatProps = {
  planetId: string // e.g. "blockchain"
  moonId: string // e.g. "hashing"
  suggested?: string[] // question chips from the moon's markdown
  onMoonLink?: (moonId: string) => void // called when a [[moon-id]] button is clicked
}

const FALLBACK = "Hmm, my signal's weak right now. Try one of the suggested questions, or ask me again in a moment!"

/** "Ask Algo" chat box: a floating button that opens a little chat with Algo. */
export default function AlgoChat({ planetId, moonId, suggested = [], onMoonLink }: AlgoChatProps) {
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
  // Stop any answer still streaming when the moon changes or the chat unmounts
  useEffect(() => () => { abortRef.current?.abort(); stopAlgoVoice() }, [moonId])

  // Keep the newest message in view
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages])

  async function send(text: string) {
    const question = text.trim()
    if (!question || streaming) return

    const history: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    // Adds each streamed piece onto the last (assistant) message.
    // Algo's voice starts with the first word and stops when he's done.
    let voiceStarted = false
    const appendToAnswer = (piece: string) => {
      if (!voiceStarted) { voiceStarted = true; startAlgoVoice() }
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, content: last.content + piece }
        return next
      })
    }

    try {
      await streamTutor({ system: planetId, moon_id: moonId, messages: history }, appendToAnswer, abort.signal)
    } catch {
      if (abort.signal.aborted) return
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: FALLBACK }])
    } finally {
      if (!abort.signal.aborted) {
        stopAlgoVoice()
        setStreaming(false)
      }
    }
  }

  // Closing the chat stops any answer in progress
  function close() {
    abortRef.current?.abort()
    stopAlgoVoice()
    setStreaming(false)
    setOpen(false)
  }

  const waitingForFirstWord = streaming && messages[messages.length - 1]?.content === ''

  // Closed: just the "Ask Algo" button
  if (!open) {
    return (
      <button
        onClick={() => { playAlgoClick(); setOpen(true) }}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border border-mint/50 bg-glass py-1.5 pr-4 pl-1.5 font-bold text-ink shadow-xl backdrop-blur cursor-pointer hover:border-mint"
      >
        <span className="block h-10 w-10"><Algo /></span>
        Ask Algo
      </button>
    )
  }

  return (
    <section
      aria-label="Chat with Algo"
      className="fixed inset-x-2 bottom-2 z-40 flex h-[min(520px,75vh)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-glass shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={playAlgoClick} aria-label="Algo" className="block h-12 w-12 shrink-0 cursor-pointer">
          <Algo talking={streaming && !waitingForFirstWord} />
        </button>
        <div className="min-w-0">
          <p className="font-display text-sm tracking-wider">ALGO</p>
          <p className="text-xs text-muted">{waitingForFirstWord ? 'Thinking…' : 'Your space guide'}</p>
        </div>
        <button
          onClick={close}
          aria-label="Close chat"
          className="ml-auto rounded-full px-2 text-xl text-muted cursor-pointer hover:text-ink"
        >
          ×
        </button>
      </header>

      {/* Messages */}
      <div ref={logRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted">
            Stuck on something? Ask me anything about this moon and I'll explain it in plain words.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'self-end rounded-br-sm bg-sky/20 text-ink'
                : 'self-start rounded-bl-sm border border-white/10 bg-white/5 text-ink'
            }`}
          >
            {m.content === '' ? (
              <span className="text-muted italic">Algo is thinking…</span>
            ) : (
              <MessageText text={m.content} onMoonLink={onMoonLink} />
            )}
          </div>
        ))}
      </div>

      {/* Suggested questions (shown until the chat starts) */}
      {messages.length === 0 && suggested.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {suggested.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-mint/40 px-3 py-1 text-xs text-ink cursor-pointer hover:border-mint hover:bg-mint/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex gap-2 border-t border-white/10 px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Algo a question…"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink placeholder:text-muted focus:border-mint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="rounded-full bg-mint px-4 text-sm font-bold text-void cursor-pointer disabled:cursor-default disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  )
}

/** Shows message text, turning [[moon-id]] into clickable buttons. */
function MessageText({ text, onMoonLink }: { text: string; onMoonLink?: (id: string) => void }) {
  const parts = text.split(/\[\[([a-z0-9-]+)\]\]/g) // odd indexes are moon ids
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <button
            key={i}
            onClick={() => onMoonLink?.(part)}
            className="mx-0.5 inline rounded-full border border-gold/50 px-2 text-xs text-gold cursor-pointer hover:bg-gold/10"
          >
            🌙 {part.replace(/-/g, ' ')}
          </button>
        ),
      )}
    </>
  )
}
