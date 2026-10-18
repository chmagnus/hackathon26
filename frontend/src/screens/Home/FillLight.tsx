import { FILL } from './lighting'

/** The Universe's soft cool fill (see lighting.ts): night sides come out dark blue-grey instead of black. */
export function FillLight() {
  return <hemisphereLight args={[FILL.sky, FILL.ground, FILL.intensity]} />
}
