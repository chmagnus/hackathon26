import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyChain } from '../src/api/content.ts'

test('verifyChain posts the edits and returns the recomputed chain', async (context) => {
  const result = { first_broken: 'hashing', moons: [{ id: 'ledgers', hash: 'a', valid: true }, { id: 'hashing', hash: 'b', valid: false }] }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(result))
  assert.deepEqual(await verifyChain('blockchain', { hashing: 'edited' }), result)
  const [url, init] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/systems/blockchain/verify')
  assert.equal(init.method, 'POST')
  assert.deepEqual(JSON.parse(init.body), { edits: { hashing: 'edited' } })
  fetchMock.mock.mockImplementation(async () => Response.json({ error: { code: 'chain_disabled' } }, { status: 409 }))
  await assert.rejects(verifyChain('sorting', {}), /409/)
})
