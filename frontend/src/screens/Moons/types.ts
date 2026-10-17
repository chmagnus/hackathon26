/**
 * Planet / Orbit / Moon shapes, copied from the backend Pydantic schemas (Nova context, section 7).
 * Field names stay snake_case to match the JSON the API sends.
 * Temporary: swap for the generated src/api/types.ts once the shared types exist.
 */

export interface Check {
  question: string
  options: string[]
  answer: string
}

export interface Moon {
  id: string
  title: string
  summary: string
  goal: string
  body: string
  orbit: number
  order: number
  widget?: string | null
  links?: string[]
  check: Check
  suggested?: string[]
  hash?: string | null
  prev_hash?: string | null
  nonce?: number
}

export interface Orbit {
  number: number
  title: string
  moons: Moon[]
}

/** The planet's intro text, which is also the genesis block when `chain` is true. */
export interface Star {
  body: string
  hash?: string | null
}

/** `StarSystem` in the backend schemas. Nova now calls this a Planet. */
export interface StarSystem {
  id: string
  title: string
  colour: string
  chain: boolean
  star: Star
  orbits: Orbit[]
}

export type Planet = StarSystem
