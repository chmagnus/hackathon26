import assert from 'node:assert/strict'
import test from 'node:test'

test('lesson edits persist per planet, can be restored, and reset clears them', async () => {
  const data = new Map()
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
  const { useProgress } = await import('../src/store/progress.ts')
  const saved = () => JSON.parse(data.get('galaxy-progress-v1')).state.systems
  useProgress.getState().completeMoon('blockchain', 'ledgers')
  useProgress.getState().editMoon('blockchain', 'hashing', 'Alice pays Bob 50')
  useProgress.getState().editMoon('blockchain', 'blocks', 'tampered')
  assert.deepEqual(saved().blockchain, { completed: ['ledgers'], edits: { hashing: 'Alice pays Bob 50', blocks: 'tampered' } })
  useProgress.getState().editMoon('blockchain', 'hashing', null)
  assert.deepEqual(useProgress.getState().systems.blockchain.edits, { blocks: 'tampered' })
  await useProgress.persist.rehydrate()
  assert.deepEqual(useProgress.getState().systems.blockchain, { completed: ['ledgers'], edits: { blocks: 'tampered' } })
  useProgress.getState().reset()
  assert.deepEqual(saved(), {})
})
