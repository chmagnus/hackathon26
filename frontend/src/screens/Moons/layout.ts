/**
 * Where things sit in the moon system (values from the prototype's moons scene, in its own units).
 * The whole system is drawn around Home's planet and scaled by MOON_SYSTEM_SCALE, so the ring ends up
 * MOON_RING_WORLD_RADIUS from the planet's centre (outside Home's Saturn-style ring).
 */

export const MOON_ORBIT_RADIUS = 12.5
/** Tilt of the moon ring around the x axis, in radians. */
export const MOON_ORBIT_TILT = 0.38
/** Radians per second (one lap takes about 3 minutes). */
export const MOON_ORBIT_SPEED = 0.035

/** Ring radius in world units around Home's planet (radius 2.6, its own ring reaches 6). */
export const MOON_RING_WORLD_RADIUS = 7
export const MOON_SYSTEM_SCALE = MOON_RING_WORLD_RADIUS / MOON_ORBIT_RADIUS

const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Angle of chapter `index` (0-based) on the ring. The first chapter starts at the back. */
export function chapterAngle(index: number, count: number, time: number): number {
  const spin = reducedMotion ? 0 : time * MOON_ORBIT_SPEED
  return -Math.PI / 2 + (index / count) * Math.PI * 2 + spin
}

/** Position of chapter `index` in the ring's own (untilted, unscaled) space, with a gentle bob. `time` is in seconds. */
export function chapterPosition(index: number, count: number, time: number): [number, number, number] {
  const a = chapterAngle(index, count, time)
  return [Math.cos(a) * MOON_ORBIT_RADIUS, Math.sin(time * 0.7 + index) * 0.25, Math.sin(a) * MOON_ORBIT_RADIUS]
}

/** Angle halfway between chapter `index` and the next one: where the arrow between them sits. */
export function arrowAngle(index: number, count: number, time: number): number {
  return (chapterAngle(index, count, time) + chapterAngle(index + 1, count, time)) / 2
}
