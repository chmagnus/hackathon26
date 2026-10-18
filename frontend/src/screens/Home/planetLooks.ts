/**
 * Which real planet each algorithm-planet looks like (Blockchain is the Earth, drawn by EarthBody).
 * Texture names are base names in public/textures (see textureSet.ts); sources are in the README's CREDITS.
 */
import type { AtmosphereLook } from './atmosphere'
import type { PlanetId } from './planets'

export interface PlanetLook {
  map: string
  normal?: string
  atmosphere: AtmosphereLook
  /** neighbouring cloud bands slowly slide against each other (gas giants) */
  bandDrift?: boolean
}

export const PLANET_LOOKS: Record<Exclude<PlanetId, 'blockchain'>, PlanetLook> = {
  // Dijkstra & OSPF
  dijkstra: {
    map: 'neptune',
    atmosphere: { day: [0.32, 0.56, 1.0], dusk: [0.1, 0.16, 0.4], strength: 1.0, scale: 1.04 },
  },
  // Sorting
  sorting: {
    map: 'jupiter',
    atmosphere: { day: [0.95, 0.78, 0.55], dusk: [0.3, 0.18, 0.1], strength: 0.55, scale: 1.03 },
    bandDrift: true,
  },
  // Binary search: thin dusty air (Mars's sunsets are actually bluish, hence the dusk colour)
  'binary-search': {
    map: 'mars',
    normal: 'mars_normal',
    atmosphere: { day: [0.95, 0.55, 0.3], dusk: [0.12, 0.16, 0.3], strength: 0.45, scale: 1.022 },
  },
}
