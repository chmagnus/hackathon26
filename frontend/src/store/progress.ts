import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type PlanetProgress = { completed: string[]; edits: Record<string, string> }
type Progress = {
  version: 1
  systems: Record<string, PlanetProgress>
  captured: string[]
  completeMoon: (planetId: string, moonId: string) => void
  /** the learner's rewrite of one lesson's text, to see the hash chain break. null puts the original back. */
  editMoon: (planetId: string, moonId: string, body: string | null) => void
  capturePlanet: (planetId: string) => void
  reset: () => void
}

const planetOf = (state: Progress, planetId: string): PlanetProgress => state.systems[planetId] ?? { completed: [], edits: {} }

export const useProgress = create<Progress>()(persist((set) => ({
  version: 1,
  systems: {},
  captured: [],
  completeMoon: (planetId, moonId) => set((state) => {
    const current = planetOf(state, planetId)
    if (current.completed.includes(moonId)) return state
    return { systems: {
      ...state.systems,
      [planetId]: { ...current, completed: [...current.completed, moonId] },
    } }
  }),
  editMoon: (planetId, moonId, body) => set((state) => {
    const current = planetOf(state, planetId)
    const edits = { ...current.edits }
    if (body === null) delete edits[moonId]
    else edits[moonId] = body
    return { systems: { ...state.systems, [planetId]: { ...current, edits } } }
  }),
  capturePlanet: (planetId) => set((state) => state.captured.includes(planetId) ? state : { captured: [...state.captured, planetId] }),
  reset: () => set({ systems: {}, captured: [] }),
}), {
  name: 'galaxy-progress-v1',
  // Blocked storage or a full quota must not interrupt an in-memory lesson.
  storage: createJSONStorage(() => ({
    getItem: (key) => { try { return localStorage.getItem(key) } catch { return null } },
    setItem: (key, value) => { try { localStorage.setItem(key, value) } catch { /* keep this session's progress */ } },
    removeItem: (key) => { try { localStorage.removeItem(key) } catch { /* keep this session's progress */ } },
  })),
  partialize: ({ version, systems, captured }) => ({ version, systems, captured }),
}))
