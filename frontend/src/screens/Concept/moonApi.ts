// Loads one moon (lesson) from the backend content API:
//   GET /api/systems/{planetId}/moons/{moonId}
// If the backend isn't running yet, it falls back to a built-in copy of the lessons
// so the page still works while you build it.

export type DialogueStep = { id: string; title: string; body: string }

export type Moon = {
  id: string
  title: string
  summary: string
  goal: string
  orbit: number
  order: number
  dialogue_steps: DialogueStep[]
  check: { question: string; options: string[]; answer: string }
  links: string[]
  suggested: string[]
}

// One request per moon: callers share the same promise, so the Moon screen can prefetch a chapter's lessons
// and the page reuses them. A failed fetch is dropped from the cache so the next call retries.
const cache = new Map<string, Promise<Moon>>()

export function fetchMoon(planetId: string, moonId: string): Promise<Moon> {
  const key = `${planetId}/${moonId}`
  let request = cache.get(key)
  if (!request) {
    request = loadMoon(planetId, moonId)
    cache.set(key, request)
    const sent = request
    sent.catch(() => { if (cache.get(key) === sent) cache.delete(key) })
  }
  return request
}

async function loadMoon(planetId: string, moonId: string): Promise<Moon> {
  try {
    const res = await fetch(`/api/systems/${planetId}/moons/${moonId}`)
    // Without the backend, Vite answers with its own HTML page, so check it's really JSON
    const isJson = res.headers.get('content-type')?.includes('application/json')
    if (res.ok && isJson) return await res.json()
  } catch {
    // network error: fall through to the built-in copy
  }

  const fallback = FALLBACK_MOONS[moonId]
  if (!fallback) throw new Error(`No moon called "${moonId}"`)
  console.warn(`Backend not available, using built-in copy of "${moonId}"`)
  return fallback
}

/* ---------- Built-in copy of backend/src/content_data.py (keep in sync for now) ---------- */

const FALLBACK_MOONS: Record<string, Moon> = {
  ledgers: {
    id: 'ledgers',
    title: 'Ledgers',
    summary: 'A shared record needs a way to reveal changes to its past.',
    goal: 'Explain why an editable ledger needs tamper detection.',
    orbit: 1,
    order: 1,
    dialogue_steps: [
      { id: 'step-1', title: 'A shared record', body: 'A ledger is a record of transactions. Imagine Alice and Bob recording their payments in a shared notebook: Alice pays Bob five tokens.' },
      { id: 'step-2', title: 'What if someone edits the past?', body: 'Someone could change that old payment from five tokens to fifty. A plain editable notebook does not tell later readers what the entry originally said.' },
      { id: 'step-3', title: 'We need a way to detect changes', body: 'A shared history needs a way to reveal edits. Next, explore [[hashing]] to learn how a digital fingerprint can help detect a change.' },
    ],
    check: {
      question: 'What is a risk when anyone can silently edit an old ledger entry?',
      options: ['Past transactions can be rewritten', 'The ledger cannot store numbers', 'Every payment becomes encrypted'],
      answer: 'Past transactions can be rewritten',
    },
    links: ['hashing'],
    suggested: ['Why is an ordinary shared notebook not enough?'],
  },
  hashing: {
    id: 'hashing',
    title: 'Hashing',
    summary: 'A hash is a fixed-length fingerprint of data.',
    goal: 'Recognise that identical inputs produce identical hashes.',
    orbit: 1,
    order: 2,
    dialogue_steps: [
      { id: 'step-1', title: 'A digital fingerprint', body: 'A hash function takes data and produces a fixed-length fingerprint. SHA-256 produces a 256-bit value, usually shown as 64 hexadecimal characters.' },
      { id: 'step-2', title: 'Same input, same fingerprint', body: 'Hash exactly the same text twice and you get the same result. Changing the text produces a different-looking fingerprint. Different computers can compare their results.' },
      { id: 'step-3', title: 'Compare with a trusted record', body: 'To detect a change in a [[ledgers]] entry, hash it again and compare the result with its trusted original fingerprint. A hash alone does not prevent someone replacing both the text and the stored fingerprint.' },
    ],
    check: {
      question: 'What does SHA-256 produce for exactly the same input each time?',
      options: ['The same hash', 'A randomly chosen hash', 'The original text'],
      answer: 'The same hash',
    },
    links: ['ledgers'],
    suggested: ['Does a hash prevent someone editing a file?'],
  },
}
