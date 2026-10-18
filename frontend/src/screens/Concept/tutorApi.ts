// Talks to the AI tutor (POST /api/tutor), following the team's API contract.
// The answer streams back as server-sent events:
//   data: {"type": "token", "text": "A nonce is "}
//   data: {"type": "done"}
//   data: {"type": "error", "message": "..."}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type TutorRequest = {
  system: string // planet id, e.g. "blockchain"
  moon_id: string // e.g. "hashing"
  messages: ChatMessage[]
  completed?: string[]
}

// Set to true to always use the fake Algo (saves AI quota while building).
// When false, it uses the real backend and only falls back to the fake if the backend isn't reachable.
const USE_MOCK = false

/** Sends the chat to the tutor and calls onToken for each piece of the answer as it arrives. */
export async function streamTutor(
  req: TutorRequest,
  onToken: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  // The backend rejects empty messages (e.g. an answer cut off when the chat was closed)
  // and messages over 2000 characters. The contract says only send the last 6–8 turns.
  const messages = req.messages
    .filter((m) => m.content.trim() !== '')
    .map((m) => ({ ...m, content: m.content.slice(0, 2000) }))
    .slice(-8)
  while (messages[0]?.role === 'assistant') messages.shift() // start with the learner's question
  const body = { ...req, messages }

  if (USE_MOCK) return mockStream(body, onToken, signal)

  let res: Response
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    console.warn('Tutor backend not reachable, using the fake Algo')
    return mockStream(body, onToken, signal)
  }

  // Backend not running (Vite answers 404) -> fake Algo, so the chat still works while building
  const isStream = res.headers.get('content-type')?.includes('text/event-stream')
  if (res.status === 404 || (res.ok && !isStream)) {
    console.warn('Tutor backend not available, using the fake Algo')
    return mockStream(body, onToken, signal)
  }
  if (!res.ok || !res.body) throw new Error(`Tutor request failed (${res.status})`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // keep any half-received line for next time

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const event = JSON.parse(line.slice(5).trim())
      if (event.type === 'token') onToken(event.text)
      else if (event.type === 'error') throw new Error(event.message)
      else if (event.type === 'done') return
    }
  }
}

/* ---------- Fake tutor for development ---------- */

const MOCK_ANSWERS: [RegExp, string][] = [
  [/hash/i, "A hash is like a fingerprint for data. Feed in any text and you get a short code back, and the same text always gives the same code. Try changing one letter and see what happens, or check out [[avalanche-effect]]."],
  [/nonce|mining|mine/i, "A nonce is just a number miners keep changing until the block's hash looks right. It's like spinning a combination lock until it clicks. You'll try it yourself in [[nonce]]."],
  [/chain|block/i, "Each block remembers the hash of the block before it, like a chain of paper links. Break one link and every link after it falls apart. That's the idea behind [[tamper-detection]]."],
]
const MOCK_DEFAULT = "Good question! I'm only a pretend Algo right now, so I can't answer properly yet. Once the real tutor is connected I'll explain it using what's on this moon."

async function mockStream(req: TutorRequest, onToken: (t: string) => void, signal?: AbortSignal) {
  const question = req.messages[req.messages.length - 1]?.content ?? ''
  const answer = MOCK_ANSWERS.find(([re]) => re.test(question))?.[1] ?? MOCK_DEFAULT

  await wait(500) // "thinking"
  for (const word of answer.split(' ')) {
    if (signal?.aborted) return
    onToken(word + ' ')
    await wait(35 + Math.random() * 50)
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
