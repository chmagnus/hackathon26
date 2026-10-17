/**
 * The 3D part of the Home screen: your star in the middle, planets drifting freely around it,
 * and completed planets pulled into orbit rings around the star.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { HOME_PLANETS, ORBIT_RADII, type HomePlanet, type PlanetId } from './planets'
import { PlanetBody } from './PlanetBody'
import { Sky } from './Sky'
import { Star } from './Star'

export interface HomeSceneProps {
  completedMoons: Partial<Record<PlanetId, number>>
  /** planets in the user's orbit, in the order they were completed */
  captured: PlanetId[]
  /** a planet that was completed just before coming back here: plays the pull-into-orbit animation */
  justCaptured?: PlanetId | null
  /** planet the camera is flying to (set when one is clicked) */
  focusId: PlanetId | null
  onPlanetClick: (id: PlanetId) => void
  /** element the planet labels are attached to. Without a fixed one, drei rebuilds the labels after the first frame and the first label comes out empty. */
  labelRoot: RefObject<HTMLDivElement>
}

const START = new THREE.Vector3(0, 38, 84)
const ORIGIN = new THREE.Vector3(0, 0, 0)

/** Shared mutable positions so the camera can follow a moving planet. */
const positions: Partial<Record<PlanetId, THREE.Vector3>> = {}

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
    positions[planet.id] = pos
  })

  const inOrbit = slot >= 0
  const status = inOrbit ? 'In your orbit' : planet.live ? `${done} of ${planet.moons} moons` : 'Coming soon'

  return (
    <group ref={group}>
      <PlanetBody planet={planet} onClick={(e) => { e.stopPropagation(); onClick() }} />
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

/** Drag to orbit, scroll to zoom; flies towards a planet when `focusId` is set. */
function CameraRig({ focusId }: { focusId: PlanetId | null }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const intro = useRef(1.8)
  const lastFocus = useRef<PlanetId | null>(null)
  // pull the camera back on tall/narrow screens so every planet still fits
  const start = useMemo(() => START.clone().multiplyScalar(Math.max(1, Math.pow(1.5 / aspect, 0.72))), [aspect])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    if (lastFocus.current && !focusId) intro.current = 1.8 // fly back out after a planet was focused
    lastFocus.current = focusId
    const target = focusId ? positions[focusId] : undefined
    if (target) {
      c.enabled = false
      c.target.lerp(target, Math.min(1, dt * 3))
      const away = camera.position.clone().sub(target).normalize().multiplyScalar(14)
      camera.position.lerp(target.clone().add(away), Math.min(1, dt * 3))
      camera.lookAt(c.target) // controls are disabled here, so aim the camera ourselves
    } else {
      c.enabled = true
      if (intro.current > 0) {
        // gentle fly-in when the screen first appears
        intro.current -= dt
        camera.position.lerp(start, Math.min(1, dt * 2))
        c.target.lerp(ORIGIN, Math.min(1, dt * 2))
      }
    }
    // no c.update() here: drei's <OrbitControls> already updates every frame, and updating twice made the camera jitter
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={30}
      maxDistance={260}
      autoRotate={!focusId}
      autoRotateSpeed={0.25}
      maxPolarAngle={Math.PI * 0.8}
    />
  )
}

export function HomeScene({ completedMoons, captured, justCaptured, focusId, onPlanetClick, labelRoot }: HomeSceneProps) {
  return (
    <>
      <color attach="background" args={['#03040a']} />
      {/* low ambient light keeps each planet's night side properly dark */}
      <ambientLight color="#404a70" intensity={0.15} />
      <Sky />
      <CameraRig focusId={focusId} />
      <Star />
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
      {/* glow: makes the star and the bright atmosphere rims bleed light like a camera lens */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.6} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
        {/* tone mapping has to happen here: the renderer's own setting is skipped when effects are on */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
