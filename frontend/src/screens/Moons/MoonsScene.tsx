/**
 * The 3D part of the Planet view: the same planet as on Home, seen up close, with one chapter moon per orbit
 * circling it on a single tilted ring. Reuses Home's planet, star, starfield and post-processing so the
 * two screens look like one place.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { PlanetBody } from '../Home/PlanetBody'
import { HOME_PLANETS } from '../Home/planets'
import { Star } from '../Home/Star'
import { radialTexture } from '../Home/textures'
import { chapterPosition, CHAPTER_ORBIT_RADIUS, CHAPTER_ORBIT_TILT, PLANET_POSITION } from './layout'
import type { Planet } from './types'

const MOON_RADIUS = 0.9

function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => Array.from({ length: 181 }, (_, k) => {
    const a = (k / 180) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)
  }), [radius])
  return <Line points={points} color="#97a3c2" transparent opacity={0.45} lineWidth={1} />
}

/** Copied from HomeScene (not exported there). Move both into a shared place if the team agrees. */
function Nebula() {
  const tex = useMemo(() => radialTexture([[0, 'rgba(255,255,255,.9)'], [0.4, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), [])
  const clouds: [string, [number, number, number], number, number][] = [
    ['#1d6f80', [320, 160, -560], 560, 0.2],
    ['#6b3a63', [-460, -90, -460], 500, 0.16],
    ['#2a4c9a', [60, -280, -640], 460, 0.14],
  ]
  return (
    <>
      {clouds.map(([color, pos, size, opacity], i) => (
        <sprite key={i} position={pos} scale={size}>
          <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  )
}

/** The chapter moons, moved along the ring every frame. userData.orbitNumber says which chapter a click hit. */
function ChapterMoons({ planet }: { planet: Planet }) {
  const moons = useRef<THREE.Mesh[]>([])
  const count = planet.orbits.length

  useFrame((state) => {
    const t = state.clock.elapsedTime
    moons.current.forEach((m, i) => m?.position.set(...chapterPosition(i, count, t)))
  })

  return (
    <>
      {planet.orbits.map((orbit, i) => (
        <mesh
          key={orbit.number}
          ref={(el) => { if (el) moons.current[i] = el }}
          position={chapterPosition(i, count, 0)}
          userData={{ orbitNumber: orbit.number }}
        >
          <sphereGeometry args={[MOON_RADIUS, 32, 32]} />
          <meshStandardMaterial color="#cdd5ea" roughness={0.85} />
        </mesh>
      ))}
    </>
  )
}

export function MoonsScene({ planet }: { planet: Planet }) {
  // Home's look for this planet (shader colours, size, ring). Falls back to the first Home planet for unknown ids.
  const look = HOME_PLANETS.find((p) => p.id === planet.id) ?? HOME_PLANETS[0]

  return (
    <>
      <color attach="background" args={['#03040a']} />
      {/* same lighting as Home: the star's light plus a low ambient so the night side stays dark */}
      <ambientLight color="#404a70" intensity={0.15} />
      <Stars radius={300} depth={200} count={5000} factor={5} saturation={0.2} fade speed={0.4} />
      <Nebula />
      <Star />

      <group position={PLANET_POSITION}>
        {/* PlanetBody spins itself slowly on its axis */}
        <PlanetBody planet={look} />
        <group rotation={CHAPTER_ORBIT_TILT}>
          <OrbitRing radius={CHAPTER_ORBIT_RADIUS} />
          <ChapterMoons planet={planet} />
        </group>
      </group>

      {/* temporary: drag to look around until the real camera exists */}
      <OrbitControls makeDefault target={PLANET_POSITION} enablePan={false} enableDamping minDistance={8} maxDistance={80} />

      {/* same glow and tone mapping as Home, so the planet shader looks identical */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.6} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
