/**
 * Demo progress until the shared progress store exists: chapter 1 (Foundations) finished, chapter 2 half done.
 */
import type { ChapterProgress } from './chapters'

export const MOCK_PROGRESS: ChapterProgress = {
  completed: [
    // chapter 1 · Foundations (all 4)
    'ledgers', 'hashing', 'avalanche-effect', 'digital-signatures',
    // chapter 2 · The chain (2 of 4)
    'blocks', 'previous-hash',
  ],
}
