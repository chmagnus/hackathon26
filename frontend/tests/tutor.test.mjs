import assert from 'node:assert/strict'
import test from 'node:test'
import { streamTutor, TutorError } from '../src/screens/Concept/tutorApi.ts'

const question = { system: 'blockchain', moon_id: 'hashing', messages: [{ role: 'user', content: 'What is a hash?' }] }
const sse = (events) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''), {
  headers: { 'Content-Type': 'text/event-stream' },
})

test('streamTutor passes on each token until the tutor is done', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => sse([
    { type: 'token', text: 'A hash is ' }, { type: 'token', text: 'a fingerprint.' }, { type: 'done' },
  ]))
  const tokens = []
  await streamTutor(question, (t) => tokens.push(t))
  assert.deepEqual(tokens, ['A hash is ', 'a fingerprint.'])
})

test('tutor failures reject with the backend message instead of a fake answer', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(
    { error: { code: 'rate_limited', message: "The tutor has reached today's limit. Try again tomorrow." } }, { status: 429 },
  ))
  const tokens = []
  await assert.rejects(streamTutor(question, (t) => tokens.push(t)), (e) => e instanceof TutorError && /today's limit/.test(e.message))

  fetchMock.mock.mockImplementation(async () => sse([{ type: 'token', text: 'Hal' }, { type: 'error', message: 'The tutor is unavailable right now.' }]))
  await assert.rejects(streamTutor(question, (t) => tokens.push(t)), (e) => e instanceof TutorError && /unavailable/.test(e.message))

  // Outside development, a missing backend is an error, not the fake Algo
  fetchMock.mock.mockImplementation(async () => new Response('Not found', { status: 404 }))
  await assert.rejects(streamTutor(question, (t) => tokens.push(t)), /404/)
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('fetch failed') })
  await assert.rejects(streamTutor(question, (t) => tokens.push(t)), /fetch failed/)
  assert.deepEqual(tokens, ['Hal'])
})
