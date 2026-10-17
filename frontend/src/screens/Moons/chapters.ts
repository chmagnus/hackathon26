/**
 * Each orbit is one chapter, shown as a single moon. Its concepts open when the chapter moon is clicked.
 */
import type { Orbit } from './types'

/** 'broken' is reserved for the tamper feature (a chapter whose hashes no longer match); chapterState() never returns it yet. */
export type ChapterState = 'locked' | 'current' | 'completed' | 'broken'

/** The part of Nova's stored progress this screen needs (one planet's entry in `systems`). */
export interface ChapterProgress {
  completed: string[]
}

function isFinished(orbit: Orbit, done: Set<string>): boolean {
  return orbit.moons.every((moon) => done.has(moon.id))
}

/**
 * completed = every concept in the orbit is done; current = the first unfinished orbit; locked = everything after it.
 * Needs all the planet's orbits to know which unfinished one comes first.
 */
export function chapterState(orbit: Orbit, orbits: Orbit[], progress: ChapterProgress): ChapterState {
  const done = new Set(progress.completed)
  if (isFinished(orbit, done)) return 'completed'
  const firstUnfinished = [...orbits].sort((a, b) => a.number - b.number).find((o) => !isFinished(o, done))
  return firstUnfinished?.number === orbit.number ? 'current' : 'locked'
}
