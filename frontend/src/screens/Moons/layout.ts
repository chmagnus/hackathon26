/**
 * Where things sit in the Planet view. Positions are computed, never hand-placed.
 *
 * Home's planet shader is lit by the star at the world origin, so the planet sits away from it
 * (about as far as on Home) and everything on this screen is placed relative to the planet.
 */

/** World position of the planet. The star at the origin lights it from the front right. */
export const PLANET_POSITION: [number, number, number] = [-20, 0, -35]

/** All chapter moons share one ring around the planet (outside the planet's own Saturn-style ring). */
export const CHAPTER_ORBIT_RADIUS = 10
/** Slight tilt of that ring, as [x, y, z] rotation in radians. */
export const CHAPTER_ORBIT_TILT: [number, number, number] = [0.22, 0, 0.12]
/** Radians per second: one lap takes about 80 s. */
export const CHAPTER_ORBIT_SPEED = 0.08

/** Position of chapter `index` (0-based) on the ring, relative to the planet and before the tilt. `time` is in seconds. */
export function chapterPosition(index: number, count: number, time: number): [number, number, number] {
  const angle = (index / count) * Math.PI * 2 + time * CHAPTER_ORBIT_SPEED
  return [Math.cos(angle) * CHAPTER_ORBIT_RADIUS, 0, Math.sin(angle) * CHAPTER_ORBIT_RADIUS]
}
