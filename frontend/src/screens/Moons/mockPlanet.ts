/**
 * The blockchain planet as the API will send it (Nova sections 3 and 7), for building the
 * Planet view before /api/systems/blockchain exists. Bodies are short stand-ins, and hashes are left
 * empty because the backend computes them.
 */
import type { Check, Moon, Orbit, Planet } from './types'

type MoonDraft = [id: string, title: string, summary: string, goal: string, widget: string | null, check: Check]

function orbit(number: number, title: string, drafts: MoonDraft[]): Orbit {
  const moons: Moon[] = drafts.map(([id, title, summary, goal, widget, check], i) => ({
    id, title, summary, goal, widget, check,
    body: `${summary}\n\n${goal}`,
    orbit: number,
    order: i + 1,
    nonce: 0,
    dialogue_steps: [{ id: 'step-1', title, body: `${summary}\n\n${goal}` }],
  }))
  return { number, title, moons }
}

export const MOCK_PLANET: Planet = {
  id: 'blockchain',
  title: 'Blockchain',
  colour: '#EF9F27',
  chain: true,
  star: { body: 'How do strangers agree on a shared record without trusting a middleman?' },
  orbits: [
    orbit(1, 'Foundations', [
      ['ledgers', 'Ledgers', 'A ledger is a shared record of who owes what.',
        'A shared record is only useful if nobody can secretly rewrite the past.', null,
        { question: 'What stops someone editing an old entry in a plain ledger?', options: ['Nothing', 'The date', 'The total'], answer: 'Nothing' }],
      ['hashing', 'Hashing', 'A hash is a fixed-length fingerprint of any data.',
        'A hash is a fixed-length fingerprint of any data.', 'hash-playground',
        { question: 'Does the same input always give the same hash?', options: ['Yes', 'No', 'Only sometimes'], answer: 'Yes' }],
      ['avalanche-effect', 'Avalanche effect', 'Change one letter and the whole hash changes.',
        'A tiny change gives a completely different hash.', 'hash-playground',
        { question: 'Does changing one letter change the hash?', options: ['Slightly', 'Completely', 'Not at all'], answer: 'Completely' }],
      ['digital-signatures', 'Digital signatures', 'A signature proves who wrote a transaction.',
        'Signatures prove who created a transaction.', 'sign-verify',
        { question: 'What does a valid signature prove?', options: ['Who created it', 'When it was mined', 'That it is cheap'], answer: 'Who created it' }],
    ]),
    orbit(2, 'The chain', [
      ['blocks', 'Blocks', 'A block bundles transactions with a timestamp and a hash.',
        'A block bundles transactions with a timestamp and hash.', 'block-inspector',
        { question: 'What does a block contain?', options: ['Transactions, a timestamp and a hash', 'Only one transaction', 'A password'], answer: 'Transactions, a timestamp and a hash' }],
      ['previous-hash', 'Previous hash', 'Each block points back to the one before it.',
        'Each block stores the previous block\'s hash.', 'chain-view',
        { question: 'Which hash does a block store besides its own?', options: ['The previous block\'s', 'The next block\'s', 'None'], answer: 'The previous block\'s' }],
      ['tamper-detection', 'Tamper detection', 'Edit one block and every block after it breaks.',
        'Changing one block breaks every block after it.', null,
        { question: 'You edit block 3 of 10. Which blocks fail verification?', options: ['Only block 3', 'Blocks 3 to 10', 'Blocks 1 to 3'], answer: 'Blocks 3 to 10' }],
      ['merkle-trees', 'Merkle trees', 'Many transactions summarised in one hash.',
        'Many transactions can be summarised in one hash.', 'merkle-view',
        { question: 'What does a Merkle root summarise?', options: ['All transactions in a block', 'The whole chain', 'One signature'], answer: 'All transactions in a block' }],
    ]),
    orbit(3, 'Mining', [
      ['why-rewriting-must-cost', 'Why rewriting must cost something', 'If hashes are free, anyone can fix a broken chain.',
        'Without cost, anyone could recompute all hashes.', null,
        { question: 'Why is recomputing every hash a problem?', options: ['It hides tampering', 'It deletes the chain', 'It is impossible'], answer: 'It hides tampering' }],
      ['nonce', 'Nonce', 'A number you change to get a different hash.',
        'A nonce is a number you change to get a different hash.', 'mining-race',
        { question: 'Why do miners change the nonce?', options: ['To get a different hash', 'To sign the block', 'To add a transaction'], answer: 'To get a different hash' }],
      ['proof-of-work', 'Proof of work', 'Mining is searching for a hash that meets a target.',
        'Mining means searching for a hash that meets a target.', 'mining-race',
        { question: 'What are miners searching for?', options: ['A hash below a target', 'A lost password', 'The longest block'], answer: 'A hash below a target' }],
      ['difficulty-and-rewards', 'Difficulty and rewards', 'Difficulty adjusts, and rewards keep miners honest.',
        'Difficulty adjusts over time, and rewards keep miners honest.', null,
        { question: 'Why do miners get rewards?', options: ['To keep them honest', 'To slow the network', 'To pay for storage'], answer: 'To keep them honest' }],
    ]),
    orbit(4, 'Consensus', [
      ['nodes', 'Nodes', 'Every node keeps its own copy of the chain.',
        'Every node keeps its own copy of the chain.', 'network-view',
        { question: 'How many copies of the chain are there?', options: ['One per node', 'One in total', 'One per block'], answer: 'One per node' }],
      ['forks-and-longest-chain', 'Forks and longest chain', 'When chains disagree, the longest valid one wins.',
        'The longest valid chain wins.', 'fork-simulator',
        { question: 'Two valid chains disagree. Which one wins?', options: ['The longest', 'The newest', 'The shortest'], answer: 'The longest' }],
      ['double-spending', 'Double spending and 51% attacks', 'Most of the mining power can rewrite history.',
        'Majority mining power can rewrite history.', 'fork-simulator',
        { question: 'What can an attacker with 51% of mining power do?', options: ['Rewrite recent history', 'Steal any private key', 'Nothing'], answer: 'Rewrite recent history' }],
      ['proof-of-stake', 'Proof of stake', 'Validators put down deposits instead of doing work.',
        'Proof of stake uses deposits instead of work.', null,
        { question: 'What replaces mining work in proof of stake?', options: ['Deposits', 'Faster computers', 'Passwords'], answer: 'Deposits' }],
    ]),
  ],
}
