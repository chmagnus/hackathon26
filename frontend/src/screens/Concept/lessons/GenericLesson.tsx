/**
 * Lesson page for moons without a hand-built story: the text comes from the backend (StoryLayout), and the scene
 * reuses the story lessons' pieces from storyKit (hash ring, chain of blocks, mining, chain lanes, Merkle tree, stake).
 * Each part of the story can change what the scene does. Moons not in SCENES show Algo with the part's title.
 */
import { useEffect, useRef } from 'react'
import Algo from '../Algo'
import StoryLayout, { type LessonProps } from '../StoryLayout'
import { mountScene, type SceneName, type ScenePart } from './storyKit'
import '../story.css'

/**
 * Moon id (backend/src/lessons/blockchain.py) -> scene, and what it does in each part, in order.
 * The last entry also covers any later parts and the quick check. `try: false` = just show the idea.
 */
const SCENES: Record<string, { scene: SceneName; parts?: ScenePart[] }> = {
  'avalanche-effect': { scene: 'hash', parts: [{ try: false }, { mode: 'bits' }, {}] },
  blocks: { scene: 'chain', parts: [{ try: false }, { try: false }, {}] },
  'previous-hash': { scene: 'chain', parts: [{ try: false }, { try: false }, {}, {}, { rewrite: true }] },
  'tamper-detection': { scene: 'chain', parts: [{ try: false }, {}, {}, {}, { rewrite: true }] },
  'merkle-trees': { scene: 'merkle', parts: [{ try: false }, {}, { mode: 'proof' }, { mode: 'proof' }, { mode: 'swap' }] },
  'why-rewriting-must-cost': {
    scene: 'mining',
    parts: [{ mode: 'chain', rewrite: true }, { mode: 'chain', rewrite: true }, { mode: 'chain', work: true }, { mode: 'chain', work: true }, { mode: 'race' }],
  },
  nonce: { scene: 'mining', parts: [{ mode: 'search', try: false }, { mode: 'search' }, { mode: 'search' }, { mode: 'search', zeros: true }] },
  'difficulty-and-rewards': {
    scene: 'mining',
    parts: [{ mode: 'race', crowd: true }, { mode: 'search', zeros: true }, { mode: 'search', zeros: true }, { mode: 'race', zeros: true }],
  },
  nodes: { scene: 'lanes', parts: [{ mode: 'copies', try: false }, { mode: 'copies' }, { mode: 'copies', bad: true }, { mode: 'copies', lag: true }, { mode: 'copies', bad: true }] },
  'double-spending': { scene: 'lanes', parts: [{ mode: 'attack', try: false }, { mode: 'attack' }, { mode: 'attack' }, { mode: 'attack' }, { mode: 'confirm' }] },
  'proof-of-stake': { scene: 'stake', parts: [{ try: false }, { mode: 'vote' }, { mode: 'slash' }] },
}

const FULL: ScenePart = {}

export default function GenericLesson(props: LessonProps) {
  const steps = props.moon.dialogue_steps
  const entry = props.planetId === 'blockchain' ? SCENES[props.moon.id] : undefined
  const renderStage = (active: number) => {
    if (entry) {
      const parts = entry.parts ?? []
      return <Scene scene={entry.scene} part={parts[Math.min(active, parts.length - 1)] ?? FULL} />
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="h-24 w-24"><Algo /></div>
        <p className="font-display text-lg">{steps[active]?.title ?? 'Quick check'}</p>
      </div>
    )
  }
  return <StoryLayout {...props} renderStage={renderStage} />
}

/** Hosts a storyKit scene (plain DOM, like the story lessons) and tells it which part the story is at */
function Scene({ scene, part }: { scene: SceneName; part: ScenePart }) {
  const ref = useRef<HTMLDivElement>(null)
  const live = useRef<ReturnType<typeof mountScene> | null>(null)

  useEffect(() => {
    const s = mountScene(ref.current!, scene)
    live.current = s
    return () => { s.destroy(); live.current = null }
  }, [scene])
  useEffect(() => { live.current?.set(part) }, [scene, part])

  return <div ref={ref} className="nv gscene" />
}
