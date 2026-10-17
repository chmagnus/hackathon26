/**
 * The 3D part of the Planet view, ported from the prototype's moons scene (algoverse2.html):
 * the procedurally shaded planet with its atmosphere, ring and glow; one crater moon per chapter on a
 * tilted dashed ring; arrows between consecutive chapters; starfield, nebula and a far sun.
 *
 * Clicking an unlocked moon freezes the orbits and flies the camera to it (`focused`); clearing `focused` flies back.
 * Tampering (`brokenFrom`): the first broken moon cracks red, every moon after it drifts off the ring one by one;
 * clearing it eases them back in reverse order.
 *
 * Colours are created with rawColor() and lights are scaled by PI so it matches r128's look (see MoonsScreen).
 */
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl, Html } from '@react-three/drei'
import * as THREE from 'three'
import { ChapterLabel } from './ChapterLabel'
import type { ChapterState } from './chapters'
import {
  arrowAngle, chapterPosition, CRACK_SECONDS, defaultCameraPosition, DRIFT_SECONDS, DRIFT_SLOWDOWN, DRIFT_STAGGER,
  focusCameraPosition, LIGHT_POSITION, MOON_ORBIT_RADIUS, MOON_ORBIT_TILT, ORBIT_LAP, PLANET_RADIUS,
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
const SKY = rawColor('#7cc4ff')
const MINT = rawColor('#6ff2c5')
const CORAL = rawColor('#ff7b72')

/** Moon colour for each chapter state (the prototype's mint / gold / dim, plus coral for tampered chapters). */
const STATE_COLOR: Record<ChapterState, THREE.Color> = {
  completed: MINT,
  current: rawColor('#ffcf5a'),
  locked: rawColor('#3a4466'),
  broken: CORAL,
}
const MOON_RADIUS = 1.05
const UP = new THREE.Vector3(0, 1, 0)
/** Pointer moves bigger than this (px) between press and release count as a drag, not a click. */
const DRAG_PX = 6
/** How long the crack's coral flash takes to fade (seconds). */
const FLASH_SECONDS = 0.6

/** Camera distance limits: overview, and while a moon is focused. */
const OVERVIEW_DISTANCE: [number, number] = [21, 64]
const FOCUS_DISTANCE_LIMITS: [number, number] = [4, 20]

/** Seconds of orbit motion so far. Stops advancing while paused, so moons freeze and later resume without jumping. */
type OrbitClock = RefObject<number>

const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation()
const smooth = (x: number) => x * x * (3 - 2 * x)

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
      {/* the planet blocks clicks and hovers on moons behind it */}
      <mesh ref={surface} material={surfaceMat} onClick={stop} onPointerOver={stop}>
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
      new THREE.LineDashedMaterial({ color: SKY, dashSize: 0.4, gapSize: 0.4, transparent: true, opacity: 0.3 }),
    )
    l.computeLineDistances()
    l.raycast = () => null
    return l
  }, [])
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose() }, [line])
  return <primitive object={line} />
}

interface ChapterMoonProps {
  index: number
  count: number
  orbitNumber: number
  title: string
  /** what the moon shows (progress state, or 'broken' when tampered) */
  state: ChapterState
  /** from progress alone: locked chapters can't be opened, tampered or not */
  clickable: boolean
  /** the first broken moon: plays the crack (flash + shake) and keeps a stronger glow */
  cracked: boolean
  /** off the ring (a moon after the first broken one) */
  drifting: boolean
  /** seconds to wait before drifting out (or back), for the one-by-one stagger */
  driftDelay: number
  paused: boolean
  orbitClock: OrbitClock
  onGroup: (orbitNumber: number, group: THREE.Group | null) => void
  onSelect: (orbitNumber: number) => void
}

/**
 * One chapter (orbit) as a crater moon with a halo and a name tag. userData.orbitNumber says which chapter a click hit.
 * The colour eases towards the state's colour; the current chapter pulses (as in the prototype's drawMoons).
 */
function ChapterMoon({
  index, count, orbitNumber, title, state, clickable, cracked, drifting, driftDelay, paused, orbitClock, onGroup, onSelect,
}: ChapterMoonProps) {
  const group = useRef<THREE.Group | null>(null)
  const body = useRef<THREE.Mesh>(null)
  const surfaceMat = useRef<THREE.MeshStandardMaterial>(null)
  const glowMat = useRef<THREE.SpriteMaterial>(null)
  const hovered = useRef(false)
  /** drift progress 0..1 (linear; eased when used) */
  const drift = useRef(0)
  /** how far (in orbit seconds) this moon has fallen behind the others while drifting */
  const lag = useRef(0)
  const driftStartAt = useRef(0)
  const crackAt = useRef(-Infinity)
  const clock = useThree((s) => s.clock)
  const surface = useMemo(() => craterTex(100 + index * 13), [index])
  const glow = useMemo(() => glowTex(), [])
  // start in the locked colour so the first state change already eases in
  const col = useMemo(() => STATE_COLOR.locked.clone(), [])
  useEffect(() => () => { surface.dispose(); glow.dispose() }, [surface, glow])
  // don't leave a pointer cursor behind if the moon unmounts while hovered
  useEffect(() => () => { if (hovered.current) document.body.style.cursor = '' }, [])
  useEffect(() => { driftStartAt.current = clock.elapsedTime + driftDelay }, [drifting, driftDelay, clock])
  useEffect(() => { if (cracked) crackAt.current = clock.elapsedTime }, [cracked, clock])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = group.current, m = surfaceMat.current, s = glowMat.current
    if (!g || !m || !s) return

    // drift out / back (frozen, like the orbits, while a chapter is focused)
    const before = smooth(drift.current)
    if (!paused && t >= driftStartAt.current) {
      drift.current = drifting ? Math.min(1, drift.current + dt / DRIFT_SECONDS) : Math.max(0, drift.current - dt / DRIFT_SECONDS)
    }
    const e = smooth(drift.current)
    if (!paused) {
      if (drifting) lag.current = (lag.current + dt * DRIFT_SLOWDOWN * e) % ORBIT_LAP
      // heading back: shrink the lag with the drift so the moon catches up to its own slot on the ring
      else if (before > 0) lag.current *= e / before
    }
    g.position.set(...chapterPosition(index, count, orbitClock.current - lag.current, e))

    // crack: short shake, then a coral flash that fades
    const k = t - crackAt.current
    if (k >= 0 && k < CRACK_SECONDS) {
      const amp = 0.18 * (1 - k / CRACK_SECONDS)
      g.position.x += Math.sin(k * 70) * amp
      g.position.z += Math.cos(k * 55) * amp
    }
    const flash = k >= 0 ? Math.max(0, 1 - k / FLASH_SECONDS) : 0

    if (body.current) body.current.rotation.y += dt * 0.3

    col.lerp(STATE_COLOR[state], Math.min(1, dt * (flash > 0 ? 20 : 4)))
    const isCurrent = state === 'current', isLocked = state === 'locked'
    const pulse = isCurrent ? 0.3 + 0.3 * Math.sin(t * 3) : 0
    const lift = hovered.current && clickable ? 0.25 : 0
    const crackGlow = cracked ? 0.25 : 0
    m.emissive.copy(col)
    m.emissiveIntensity = (isLocked ? 0.12 : 0.35) + pulse * 0.5 + lift + crackGlow + flash * 1.5
    s.color.copy(col)
    s.opacity = (isLocked ? 0.15 : 0.45) + pulse + lift * 0.6 + crackGlow + flash * 0.8
    g.scale.setScalar(1 + (isCurrent ? 0.08 * Math.sin(t * 3) : 0) + flash * 0.25)
  })

  return (
    <group
      ref={(el) => { group.current = el; onGroup(orbitNumber, el) }}
      position={chapterPosition(index, count, 0)}
    >
      <mesh
        ref={body}
        userData={{ orbitNumber }}
        onClick={(e) => {
          if (e.delta > DRAG_PX) return
          e.stopPropagation()
          onSelect(orbitNumber)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          hovered.current = true
          if (clickable) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hovered.current = false
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[MOON_RADIUS, 40, 28]} />
        <meshStandardMaterial ref={surfaceMat} map={surface} bumpMap={surface} bumpScale={0.07} roughness={0.95} />
      </mesh>
      <sprite scale={[4.4, 4.4, 1]} raycast={() => null}>
        <spriteMaterial ref={glowMat} map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* always mounted (unmounting drei <Html> mid-frame can crash); below the HUD (z-20) */}
      <Html position={[0, 1.6, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <ChapterLabel number={orbitNumber} title={title} state={state} />
      </Html>
    </group>
  )
}

/**
 * Cone halfway between chapter `index` and the next, pointing along the ring (the reading order).
 * Mint once chapter `index` is done; coral and faded when the chain is broken at or before it.
 */
function ChapterArrow({ index, count, done, broken, orbitClock }: {
  index: number; count: number; done: boolean; broken: boolean; orbitClock: OrbitClock
}) {
  const cone = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const m = cone.current, mt = mat.current
    if (!m || !mt) return
    const a = arrowAngle(index, count, orbitClock.current)
    m.position.set(Math.cos(a) * MOON_ORBIT_RADIUS, 0, Math.sin(a) * MOON_ORBIT_RADIUS)
    m.quaternion.setFromUnitVectors(UP, dir.set(-Math.sin(a), 0, Math.cos(a)))
    const k = Math.min(1, dt * 4)
    mt.color.lerp(broken ? CORAL : done ? MINT : SKY, k)
    mt.opacity += ((broken ? 0.15 : 0.7) - mt.opacity) * k
  })

  return (
    <mesh ref={cone} raycast={() => null}>
      <coneGeometry args={[0.28, 0.75, 14]} />
      <meshBasicMaterial ref={mat} color={SKY} transparent opacity={0.7} />
    </mesh>
  )
}

/**
 * Drag to orbit, scroll to zoom (no panning). Flies to the focused moon, or back to the overview when `focused` is null.
 * Calls onArrive(orbitNumber) once the fly-in has settled.
 */
function CameraRig({ focused, groups, onArrive }: {
  focused: number | null
  groups: RefObject<Record<number, THREE.Group>>
  onArrive: (orbitNumber: number) => void
}) {
  const controls = useRef<CameraControlsImpl>(null)
  const aspect = useThree((s) => s.size.width / s.size.height)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    let live = true
    if (focused === null) {
      ;[c.minDistance, c.maxDistance] = OVERVIEW_DISTANCE
      const [x, y, z] = defaultCameraPosition(aspect)
      c.setLookAt(x, y, z, 0, 0, 0, true)
    } else {
      const g = groups.current[focused]
      if (!g) return
      const target = g.getWorldPosition(new THREE.Vector3())
      ;[c.minDistance, c.maxDistance] = FOCUS_DISTANCE_LIMITS
      const [x, y, z] = focusCameraPosition(target)
      c.setLookAt(x, y, z, target.x, target.y, target.z, true).then(() => { if (live) onArrive(focused) })
    }
    return () => { live = false }
  }, [focused, aspect, groups, onArrive])

  const A = CameraControlsImpl.ACTION
  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={0.5}
      minPolarAngle={0.55}
      maxPolarAngle={1.75}
      mouseButtons={{ left: A.ROTATE, middle: A.DOLLY, right: A.NONE, wheel: A.DOLLY }}
      touches={{ one: A.TOUCH_ROTATE, two: A.TOUCH_DOLLY, three: A.NONE }}
    />
  )
}

export interface MoonsSceneProps {
  planet: Planet
  /** one state per orbit, in the same order as planet.orbits */
  states: ChapterState[]
  /** index (into planet.orbits) of the first chapter that fails verification, or null if the chain is intact */
  brokenFrom: number | null
  /** orbit number of the chapter the camera is on, or null for the overview */
  focused: number | null
  onSelectChapter: (orbitNumber: number) => void
  onArrive: (orbitNumber: number) => void
}

export function MoonsScene({ planet, states, brokenFrom, focused, onSelectChapter, onArrive }: MoonsSceneProps) {
  const count = planet.orbits.length
  const paused = focused !== null
  const orbitClock = useRef(0)
  const groups = useRef<Record<number, THREE.Group>>({})
  const setGroup = useCallback((orbitNumber: number, group: THREE.Group | null) => {
    if (group) groups.current[orbitNumber] = group
    else delete groups.current[orbitNumber]
  }, [])
  // orbits freeze while a chapter is focused
  useFrame((_, dt) => { if (!paused) orbitClock.current += dt })

  const isBroken = (i: number) => brokenFrom !== null && i >= brokenFrom
  // drift out one by one after the crack; drift back in reverse order (outermost chapter first)
  const driftDelay = (i: number) => brokenFrom === null
    ? (count - 1 - i) * DRIFT_STAGGER
    : i > brokenFrom ? CRACK_SECONDS + (i - brokenFrom - 1) * DRIFT_STAGGER : 0

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
          <ChapterMoon
            key={orbit.number}
            index={i}
            count={count}
            orbitNumber={orbit.number}
            title={orbit.title}
            state={isBroken(i) ? 'broken' : states[i]}
            clickable={states[i] !== 'locked'}
            cracked={brokenFrom === i}
            drifting={brokenFrom !== null && i > brokenFrom}
            driftDelay={driftDelay(i)}
            paused={paused}
            orbitClock={orbitClock}
            onGroup={setGroup}
            onSelect={onSelectChapter}
          />
        ))}
        {planet.orbits.slice(0, -1).map((orbit, i) => (
          <ChapterArrow key={orbit.number} index={i} count={count} done={states[i] === 'completed'} broken={isBroken(i)} orbitClock={orbitClock} />
        ))}
      </group>

      <CameraRig focused={focused} groups={groups} onArrive={onArrive} />
    </>
  )
}
