/**
 * The 3D part of the Planet view, ported from the prototype's moons scene (algoverse2.html):
 * the procedurally shaded planet with its atmosphere, ring and glow; one crater moon per chapter on a
 * tilted dashed ring; arrows between consecutive chapters; starfield, nebula and a far sun.
 *
 * Colours are created with rawColor() and lights are scaled by PI so it matches r128's look (see MoonsScreen).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  arrowAngle, CAMERA_DISTANCE, CAMERA_ELEVATION, chapterPosition, LIGHT_POSITION,
  MOON_ORBIT_RADIUS, MOON_ORBIT_TILT, PLANET_RADIUS,
} from './layout'
import { atmosphereMaterial, BLOCKCHAIN_SHADE, planetMaterial } from './planetShader'
import { Sky } from './Sky'
import { craterTex, glowTex, rawColor } from './textures'
import type { Planet } from './types'

const LIGHT = new THREE.Vector3(...LIGHT_POSITION)
const BACKGROUND = rawColor('#03040a')
const PLANET_GLOW = rawColor('#6ff2c5')
const AMBIENT = rawColor('#404a70')
const SUN = rawColor('#fff0dd')
const ARROW = rawColor('#7cc4ff')
/** "locked" look; state colours come later */
const DIM = rawColor('#3a4466')
const MOON_RADIUS = 1.05
const UP = new THREE.Vector3(0, 1, 0)

function PlanetBody() {
  const surface = useRef<THREE.Mesh>(null)
  const surfaceMat = useMemo(() => planetMaterial(BLOCKCHAIN_SHADE, LIGHT), [])
  const atmosphereMat = useMemo(() => atmosphereMaterial(BLOCKCHAIN_SHADE, LIGHT), [])
  const glow = useMemo(() => glowTex(), [])
  useEffect(() => () => { surfaceMat.dispose(); atmosphereMat.dispose(); glow.dispose() }, [surfaceMat, atmosphereMat, glow])

  useFrame((state, dt) => {
    const m = surface.current
    if (!m) return
    ;(m.material as THREE.ShaderMaterial).uniforms.uT.value = state.clock.elapsedTime
    m.rotation.y += dt * 0.05
  })

  return (
    <>
      <mesh ref={surface} material={surfaceMat}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 64]} />
      </mesh>
      <mesh material={atmosphereMat} raycast={() => null}>
        <sphereGeometry args={[PLANET_RADIUS * 1.07, 64, 48]} />
      </mesh>
      <mesh rotation-x={1.3} raycast={() => null}>
        <ringGeometry args={[6.4, 9.2, 120]} />
        <meshBasicMaterial color={PLANET_GLOW} transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <sprite scale={[22, 22, 1]} raycast={() => null}>
        <spriteMaterial map={glow} color={PLANET_GLOW} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  )
}

function OrbitLine() {
  const line = useMemo(() => {
    const pts = Array.from({ length: 201 }, (_, k) => {
      const a = (k / 200) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * MOON_ORBIT_RADIUS, 0, Math.sin(a) * MOON_ORBIT_RADIUS)
    })
    const l = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: ARROW, dashSize: 0.4, gapSize: 0.4, transparent: true, opacity: 0.3 }),
    )
    l.computeLineDistances()
    return l
  }, [])
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose() }, [line])
  return <primitive object={line} />
}

/** One chapter (orbit) as a crater moon with a halo. userData.orbitNumber says which chapter a click hit. */
function ChapterMoon({ index, count, orbitNumber }: { index: number; count: number; orbitNumber: number }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const surface = useMemo(() => craterTex(100 + index * 13), [index])
  const glow = useMemo(() => glowTex(), [])
  useEffect(() => () => { surface.dispose(); glow.dispose() }, [surface, glow])

  useFrame((state, dt) => {
    group.current?.position.set(...chapterPosition(index, count, state.clock.elapsedTime))
    if (body.current) body.current.rotation.y += dt * 0.3
  })

  return (
    <group ref={group} position={chapterPosition(index, count, 0)}>
      <mesh ref={body} userData={{ orbitNumber }}>
        <sphereGeometry args={[MOON_RADIUS, 40, 28]} />
        <meshStandardMaterial map={surface} bumpMap={surface} bumpScale={0.07} roughness={0.95} emissive={DIM} emissiveIntensity={0.12} />
      </mesh>
      <sprite scale={[4.4, 4.4, 1]} raycast={() => null}>
        <spriteMaterial map={glow} color={DIM} transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

/** Cone halfway between chapter `index` and the next, pointing along the ring (the reading order). */
function ChapterArrow({ index, count }: { index: number; count: number }) {
  const cone = useRef<THREE.Mesh>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const m = cone.current
    if (!m) return
    const a = arrowAngle(index, count, state.clock.elapsedTime)
    m.position.set(Math.cos(a) * MOON_ORBIT_RADIUS, 0, Math.sin(a) * MOON_ORBIT_RADIUS)
    m.quaternion.setFromUnitVectors(UP, dir.set(-Math.sin(a), 0, Math.cos(a)))
  })

  return (
    <mesh ref={cone} raycast={() => null}>
      <coneGeometry args={[0.28, 0.75, 14]} />
      <meshBasicMaterial color={ARROW} transparent opacity={0.7} />
    </mesh>
  )
}

/** Places the camera like the prototype: further back on tall/narrow screens so the whole ring fits. */
function CameraFit() {
  const fittedAspect = useRef(0)
  useFrame(({ camera, size }) => {
    const aspect = size.width / size.height
    if (aspect === fittedAspect.current) return
    fittedAspect.current = aspect
    const d = CAMERA_DISTANCE * Math.max(1, Math.pow(1.45 / aspect, 0.85))
    camera.position.set(0, Math.sin(CAMERA_ELEVATION) * d, Math.cos(CAMERA_ELEVATION) * d)
  })
  return null
}

export function MoonsScene({ planet }: { planet: Planet }) {
  const count = planet.orbits.length

  return (
    <>
      <primitive attach="background" object={BACKGROUND} />
      <Sky />
      {/* r128 lit with "legacy" intensities; newer three needs them multiplied by PI to match */}
      <ambientLight color={AMBIENT} intensity={0.55 * Math.PI} />
      <directionalLight color={SUN} intensity={1.25 * Math.PI} position={[-30, 14, 20]} />

      <PlanetBody />

      <group rotation-x={MOON_ORBIT_TILT}>
        <OrbitLine />
        {planet.orbits.map((orbit, i) => (
          <ChapterMoon key={orbit.number} index={i} count={count} orbitNumber={orbit.number} />
        ))}
        {planet.orbits.slice(0, -1).map((orbit, i) => (
          <ChapterArrow key={orbit.number} index={i} count={count} />
        ))}
      </group>

      <CameraFit />
      {/* drag to orbit, scroll to zoom, within the prototype's limits */}
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={21} maxDistance={64} minPolarAngle={0.55} maxPolarAngle={1.75} />
    </>
  )
}
