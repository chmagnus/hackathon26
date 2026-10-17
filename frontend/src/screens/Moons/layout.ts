/**
 * Where things sit in the Planet view (values from the prototype's moons scene).
 * The planet is at the origin; chapter moons share one tilted ring around it.
 */

export const PLANET_RADIUS = 4.6
/** The sun's direction: lights the planet shader and matches the directional light. */
export const LIGHT_POSITION: [number, number, number] = [-300, 140, 200]

export const MOON_ORBIT_RADIUS = 12.5
/** Tilt of the moon ring around the x axis, in radians. */
export const MOON_ORBIT_TILT = 0.38
/** Radians per second (one lap takes about 3 minutes). */
export const MOON_ORBIT_SPEED = 0.035

/** Camera: distance from the planet and height angle (radians) on a wide screen. */
export const CAMERA_DISTANCE = 38
export const CAMERA_ELEVATION = 0.32
/** How close the camera ends up to a focused moon (prototype: 7). */
export const FOCUS_DISTANCE = 7

/** Default camera position: further back on tall/narrow screens so the whole ring fits (prototype's desiredView). */
export function defaultCameraPosition(aspect: number): [number, number, number] {
  const d = CAMERA_DISTANCE * Math.max(1, Math.pow(1.45 / aspect, 0.85))
  return [0, Math.sin(CAMERA_ELEVATION) * d, Math.cos(CAMERA_ELEVATION) * d]
}

/** Camera position for a focused moon at `target` (world space): outside the ring, slightly above, so the planet sits behind the moon. */
export function focusCameraPosition(target: { x: number; y: number; z: number }): [number, number, number] {
  const len = Math.hypot(target.x, target.z) || 1
  const out = (FOCUS_DISTANCE * Math.cos(CAMERA_ELEVATION)) / len
  return [target.x + target.x * out, target.y + FOCUS_DISTANCE * Math.sin(CAMERA_ELEVATION), target.z + target.z * out]
}

const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Angle of chapter `index` (0-based) on the ring. The first chapter starts at the back. */
export function chapterAngle(index: number, count: number, time: number): number {
  const spin = reducedMotion ? 0 : time * MOON_ORBIT_SPEED
  return -Math.PI / 2 + (index / count) * Math.PI * 2 + spin
}

/** Position of chapter `index` in the ring's own (untilted) space, with a gentle bob. `time` is in seconds. */
export function chapterPosition(index: number, count: number, time: number): [number, number, number] {
  const a = chapterAngle(index, count, time)
  return [Math.cos(a) * MOON_ORBIT_RADIUS, Math.sin(time * 0.7 + index) * 0.25, Math.sin(a) * MOON_ORBIT_RADIUS]
}

/** Angle halfway between chapter `index` and the next one: where the arrow between them sits. */
export function arrowAngle(index: number, count: number, time: number): number {
  return (chapterAngle(index, count, time) + chapterAngle(index + 1, count, time)) / 2
}
