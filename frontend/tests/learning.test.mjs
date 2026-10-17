import assert from 'node:assert/strict'
import test from 'node:test'
import { chapterState } from '../src/screens/Moons/chapters.ts'
import { fetchCurriculum, fetchMoon } from '../src/api/content.ts'

test('only finishing a whole chapter unlocks its successor', () => {
  const first = { number: 1, moons: [{ id: 'one' }, { id: 'two' }] }
  const second = { number: 2, moons: [{ id: 'three' }] }
  const orbits = [first, second]
  assert.equal(chapterState(first, orbits, { completed: [] }), 'current')
  assert.equal(chapterState(second, orbits, { completed: ['one', 'unknown'] }), 'locked')
  assert.equal(chapterState(first, orbits, { completed: ['one', 'two'] }), 'completed')
  assert.equal(chapterState(second, orbits, { completed: ['one', 'two'] }), 'current')
  assert.equal(chapterState(second, orbits, { completed: ['one', 'two', 'three'] }), 'completed')
})

test('content loading follows the server planet list and rejects stale/HTML fallbacks', async (context) => {
  const calls = []
  const planets = { sorting: { id: 'sorting' }, 'binary-search': { id: 'binary-search' } }
  const fetchMock = context.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url)
    const result = url === '/api/systems' ? Object.values(planets) : planets[url.split('/').at(-1)]
    return Response.json(result)
  })
  const data = await fetchCurriculum()
  assert.deepEqual(data, Object.values(planets))
  assert.deepEqual(calls, ['/api/systems', '/api/systems/sorting', '/api/systems/binary-search'])
  fetchMock.mock.mockImplementation(async () => new Response('<html>Vite fallback</html>', { headers: { 'Content-Type': 'text/html' } }))
  await assert.rejects(fetchMoon('sorting', 'ledgers'), /did not return JSON/)
  fetchMock.mock.mockImplementation(async () => new Response('Missing moon', { status: 404 }))
  await assert.rejects(fetchMoon('sorting', 'ledgers'), /404/)
})
