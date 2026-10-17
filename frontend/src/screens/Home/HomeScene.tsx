/**
 * The 3D part of the Home screen: planets drifting freely around your star, and completed planets
 * pulled into orbit rings around it. Rendered inside the shared Universe canvas, which already holds
 * the background, ambient light, starfield, the star itself, the camera rig and bloom.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { planetPositions } from '../../galaxy/view'
import { HOME_PLANETS, ORBIT_RADII, type HomePlanet, type PlanetId } from './planets'
import { PlanetBody } from './PlanetBody'

export interface HomeSceneProps {
  completedMoons: Partial<Record<PlanetId, number>>
  /** planets in the user's orbit, in the order they were completed */
  captured: PlanetId[]
  /** a planet that was completed just before coming back here: plays the pull-into-orbit animation */
  justCaptured?: PlanetId | null
  /** planet the camera is on (planet mode): labels hide and planets can't be clicked */
  focusId: PlanetId | null
  onPlanetClick: (id: PlanetId) => void
  /** element the planet labels are attached to. Without a fixed one, drei rebuilds the labels after the first frame and the first label comes out empty. */
  labelRoot: RefObject<HTMLDivElement>
}

function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => Array.from({ length: 181 }, (_, k) => {
    const a = (k / 180) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)
  }), [radius])
  return <Line points={points} color="#ffcf5a" dashed dashSize={0.5} gapSize={0.5} transparent opacity={0.4} lineWidth={1} />
}

function DriftingPlanet({ planet, index, done, slot, animateIn, showLabel, labelRoot, onClick }: {
  planet: HomePlanet; index: number; done: number; slot: number; animateIn: boolean; showLabel: boolean; labelRoot: RefObject<HTMLDivElement>; onClick: () => void
}) {
  const group = useRef<THREE.Group>(null)
  // 0 = drifting freely, 1 = locked in orbit. A planet captured while you watch animates from 0 to 1.
  const capture = useRef(slot >= 0 && !animateIn ? 1 : 0)
  const free = useMemo(() => new THREE.Vector3(), [])
  const orbit = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const [angle, height, dist] = planet.drift
    const a = angle + Math.sin(t * 0.05 + index) * 0.25
    free.set(
      Math.cos(a) * dist + Math.sin(t * 0.11 + index) * 3,
      height + Math.sin(t * 0.09 + index * 2) * 2,
      Math.sin(a) * dist + Math.cos(t * 0.13 + index) * 3,
    )
    const target = slot >= 0 ? 1 : 0
    capture.current += (target - capture.current) * Math.min(1, dt * 0.7)
    const pos = group.current!.position.copy(free)
    if (capture.current > 0.001 && slot >= 0) {
      const R = ORBIT_RADII[slot]
      const oa = t * (0.12 / (1 + slot * 0.5)) + index * 1.7
      orbit.set(Math.cos(oa) * R, 0, Math.sin(oa) * R)
      const c = capture.current
      const eased = c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2
      pos.lerp(orbit, eased)
    }
    // shared so the camera rig can follow a moving planet
    planetPositions[planet.id] = pos
  })

  const inOrbit = slot >= 0
  const status = inOrbit ? 'In your orbit' : planet.live ? `${done} of ${planet.moons} moons` : 'Coming soon'

  return (
    <group ref={group}>
      {/* not clickable while the camera is on a planet (labels hidden) */}
      <PlanetBody planet={planet} onClick={showLabel ? (e) => { e.stopPropagation(); onClick() } : undefined} />
      {/* always mounted (unmounting drei <Html> mid-frame can crash); just faded out while flying */}
      <Html portal={labelRoot} position={[0, planet.radius + 1.6, 0]} center zIndexRange={[10, 0]} style={{ opacity: showLabel ? 1 : 0, transition: 'opacity .3s', pointerEvents: showLabel ? 'auto' : 'none' }}>
          <button
            onClick={onClick}
            className={`block cursor-pointer whitespace-nowrap rounded-xl border bg-[#060914]/80 px-3 py-1.5 text-center backdrop-blur ${
              inOrbit ? 'border-mint/40 text-mint' : planet.live ? 'border-gold/50 text-gold' : 'border-white/15 text-muted'
            }`}
          >
            <span className="block font-mono text-[10.5px] uppercase tracking-widest text-muted">{status}</span>
            <span className="text-sm font-bold">{planet.name}</span>
          </button>
      </Html>
    </group>
  )
}

// the camera (intro, auto-rotate, fly to planet) is the shared rig in src/galaxy/CameraRig.tsx

export function HomeScene({ completedMoons, captured, justCaptured, focusId, onPlanetClick, labelRoot }: HomeSceneProps) {
  return (
    <>
      {captured.map((id, slot) => <OrbitRing key={id} radius={ORBIT_RADII[slot]} />)}
      {HOME_PLANETS.map((p, i) => (
        <DriftingPlanet
          key={p.id}
          planet={p}
          index={i}
          done={completedMoons[p.id] ?? 0}
          slot={captured.indexOf(p.id)}
          animateIn={justCaptured === p.id}
          showLabel={!focusId}
          labelRoot={labelRoot}
          onClick={() => onPlanetClick(p.id)}
        />
      ))}
    </>
  )
}
