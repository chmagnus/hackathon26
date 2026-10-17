import type { components } from './types'

export type Planet = components['schemas']['StarSystem']
export type Moon = components['schemas']['Moon']
export type DialogueStep = components['schemas']['DialogueStep']
export type SystemSummary = components['schemas']['SystemSummary']

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(10_000)
  const response = await fetch(path, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!response.ok) throw new Error(`Could not load learning content (${response.status}).`)
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The content API did not return JSON. Check that the backend is running.')
  return response.json()
}

export const fetchPlanet = (id: string, signal?: AbortSignal) =>
  getJson<Planet>(`/api/systems/${encodeURIComponent(id)}`, signal)

export async function fetchCurriculum(signal?: AbortSignal): Promise<Planet[]> {
  const summaries = await getJson<SystemSummary[]>('/api/systems', signal)
  return Promise.all(summaries.map(({ id }) => fetchPlanet(id, signal)))
}

export const fetchMoon = (planetId: string, moonId: string, signal?: AbortSignal) =>
  getJson<Moon>(`/api/systems/${encodeURIComponent(planetId)}/moons/${encodeURIComponent(moonId)}`, signal)
