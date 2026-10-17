/**
 * Planets shown on the Home screen. Each planet is one algorithm.
 * (If the team later adds a shared planets file, swap this import for that.)
 */
export type PlanetId = 'blockchain' | 'dijkstra' | 'sorting' | 'binary-search'

/** How the procedural shader draws the surface (see shaders.ts). */
export interface PlanetShade {
  /** 0 = ocean world, 1 = gas giant, 2 = ice giant, 3 = rocky desert */
  type: 0 | 1 | 2 | 3
  seed: number
  a: string
  b: string
  c: string
  d: string
  city: string
  atm: string
}

export interface HomePlanet {
  id: PlanetId
  name: string
  color: string
  radius: number
  /** false = lessons not built yet ("Coming soon") */
  live: boolean
  ring?: boolean
  /** how many moons (lessons) the planet has */
  moons: number
  /** free-drift position: [angle (rad), height, distance from the star] */
  drift: [number, number, number]
  shade: PlanetShade
}

export const HOME_PLANETS: HomePlanet[] = [
  {
    id: 'blockchain', name: 'Blockchain', color: '#6ff2c5', radius: 2.6, live: true, ring: true, moons: 5,
    drift: [0.5, 6, 40],
    shade: { type: 0, seed: 1.7, a: '#05223a', b: '#0f6f7a', c: '#2f8f6a', d: '#c9e4b0', city: '#6ff2c5', atm: '#7fe6ff' },
  },
  {
    id: 'dijkstra', name: 'Dijkstra & OSPF', color: '#7cc4ff', radius: 2.3, live: false, moons: 5,
    drift: [2.15, -7, 44],
    shade: { type: 2, seed: 4.2, a: '#163a8a', b: '#4f86e0', c: '#b4dcff', d: '#0b1a4d', city: '#000000', atm: '#7cc4ff' },
  },
  {
    id: 'sorting', name: 'Sorting', color: '#ffcf5a', radius: 2.2, live: false, moons: 4,
    drift: [3.75, 8, 42],
    shade: { type: 1, seed: 7.9, a: '#a86d34', b: '#f1d29a', c: '#6e4220', d: '#c2502c', city: '#000000', atm: '#ffcf8a' },
  },
  {
    id: 'binary-search', name: 'Binary search', color: '#ff8a7a', radius: 2.0, live: false, moons: 3,
    drift: [5.25, -5, 46],
    shade: { type: 3, seed: 2.9, a: '#5e2418', b: '#c4643e', c: '#e9a676', d: '#2e130c', city: '#000000', atm: '#ff9a7a' },
  },
]

/** Radii of the orbit rings around the star, filled in the order planets are completed. */
export const ORBIT_RADII = [13, 19, 25, 31]
