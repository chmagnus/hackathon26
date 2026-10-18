/** Moon id (backend/src/lessons/blockchain.py) -> its scene, for the moons whose story text comes from the backend */
import type { SceneMaker } from './kit'
import avalanche from './avalanche'
import blocks from './blocks'
import previousHash from './previousHash'
import tamper from './tamper'
import merkle from './merkle'
import rewrite from './rewrite'
import nonce from './nonce'
import difficulty from './difficulty'
import nodes from './nodes'
import doubleSpend from './doubleSpend'
import stake from './stake'

export const SCENES: Record<string, SceneMaker> = {
  'avalanche-effect': avalanche,
  blocks,
  'previous-hash': previousHash,
  'tamper-detection': tamper,
  'merkle-trees': merkle,
  'why-rewriting-must-cost': rewrite,
  nonce,
  'difficulty-and-rewards': difficulty,
  nodes,
  'double-spending': doubleSpend,
  'proof-of-stake': stake,
}

/** The Blockchain planet's moons in Nova's order, for the "Next up" line under "Complete moon" */
export const BLOCKCHAIN_ORDER: [id: string, title: string][] = [
  ['ledgers', 'ledgers'], ['hashing', 'hashing'], ['avalanche-effect', 'the avalanche effect'], ['digital-signatures', 'digital signatures'],
  ['blocks', 'blocks'], ['previous-hash', 'the previous hash'], ['tamper-detection', 'tamper detection'], ['merkle-trees', 'Merkle trees'],
  ['why-rewriting-must-cost', 'why rewriting must cost'], ['nonce', 'the nonce'], ['proof-of-work', 'proof of work'], ['difficulty-and-rewards', 'difficulty and rewards'],
  ['nodes', 'nodes'], ['forks-and-longest-chain', 'forks and chain selection'], ['double-spending', 'double spending and majority attacks'], ['proof-of-stake', 'proof of stake'],
]

/** "Next up: …" for a moon, in Nova's order */
export function nextUp(planetId: string, moonId: string) {
  if (planetId !== 'blockchain') return ''
  const i = BLOCKCHAIN_ORDER.findIndex(([id]) => id === moonId)
  if (i < 0) return ''
  return i === BLOCKCHAIN_ORDER.length - 1 ? "That's the whole Blockchain planet. Well done!" : `Next up: ${BLOCKCHAIN_ORDER[i + 1][1]}.`
}
