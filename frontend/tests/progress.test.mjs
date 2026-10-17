import assert from 'node:assert/strict'
import test from 'node:test'

test('lesson progress persists, avoids duplicates, resets, and tolerates blocked storage', async () => {
  const data = new Map()
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
  const { useProgress } = await import('../src/store/progress.ts')
  useProgress.getState().completeMoon('blockchain', 'ledgers')
  useProgress.getState().completeMoon('blockchain', 'ledgers')
  assert.deepEqual(useProgress.getState().systems.blockchain.completed, ['ledgers'])
  await useProgress.persist.rehydrate()
  assert.deepEqual(useProgress.getState().systems.blockchain.completed, ['ledgers'])
  useProgress.getState().completeMoon('blockchain', 'hashing')
  assert.deepEqual(JSON.parse(data.get('galaxy-progress-v1')).state.systems.blockchain.completed, ['ledgers', 'hashing'])
  useProgress.getState().capturePlanet('sorting')
  useProgress.getState().capturePlanet('blockchain')
  useProgress.getState().capturePlanet('sorting')
  assert.deepEqual(useProgress.getState().captured, ['sorting', 'blockchain'])
  await useProgress.persist.rehydrate()
  assert.deepEqual(useProgress.getState().captured, ['sorting', 'blockchain'])
  useProgress.getState().reset()
  assert.deepEqual(JSON.parse(data.get('galaxy-progress-v1')).state.systems, {})
  assert.deepEqual(useProgress.getState().captured, [])
  localStorage.setItem = () => { throw new Error('Quota exceeded') }
  assert.doesNotThrow(() => useProgress.getState().completeMoon('blockchain', 'ledgers'))
  assert.deepEqual(useProgress.getState().systems.blockchain.completed, ['ledgers'])
})
