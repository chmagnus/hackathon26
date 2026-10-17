/**
 * The moon system, drawn inside the shared Universe around Home's planet (ported from the prototype's moons scene):
 * one crater moon per chapter on a tilted dashed ring, arrows between consecutive chapters, state colours and pulse.
 * Lit by Home's star like everything else. Follows the planet as it drifts.
 *
 * The moons "emerge" from the planet as the camera flies in: ring radius and moon size grow with live.zoom,
 * the dashed ring and arrows fade in with it, and it all runs in reverse on the way out. Moons are scaled only,
 * never made see-through, to avoid sorting glitches. Labels and clicks only once zoomed in. While a chapter is
 * focused the orbits pause.
 */
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { universeLabelRoot } from '../../galaxy/labelRoot'
import { chapterPositions, live, planetPositions, REDUCED_MOTION, useView } from '../../galaxy/view'
import { HOME_PLANETS, type PlanetId } from '../Home/planets'
import { ChapterLabel } from './ChapterLabel'
import type { ChapterState } from './chapters'
import { arrowAngle, chapterPosition, MOON_ORBIT_RADIUS, MOON_ORBIT_TILT, MOON_SYSTEM_SCALE } from './layout'
import { craterTex, glowTex } from './textures'
import type { Planet } from './types'

const SKY = new THREE.Color('#7cc4ff')
const MINT = new THREE.Color('#6ff2c5')

/** Moon colour for each chapter state (the prototype's mint / gold / dim). */
const STATE_COLOR: Record<ChapterState, THREE.Color> = {
  completed: MINT,
  current: new THREE.Color('#ffcf5a'),
  locked: new THREE.Color('#3a4466'),
}
const MOON_RADIUS = 1.05
const UP = new THREE.Vector3(0, 1, 0)
/** Pointer moves bigger than this (px) between press and release count as a drag, not a click. */
const DRAG_PX = 6

/** Seconds of orbit motion so far. Stops advancing while paused, so moons freeze and later resume without jumping. */
type OrbitClock = RefObject<number>

const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation()

/** How far the moons have emerged (0 = inside the planet, 1 = full ring). With reduced motion: no growing, just on/off. */
const emerged = () => (REDUCED_MOTION ? (live.zoom > 0.5 ? 1 : 0) : live.zoom)
/** Scale can't be exactly 0 (the matrix would be singular), so collapse to this instead. */
const TINY = 1e-3

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

  // grows out of the planet and fades in with the moons
  const ref = useRef<THREE.Line>(null)
  useFrame(() => {
    const l = ref.current
    if (!l) return
    const e = emerged()
    l.scale.setScalar(Math.max(TINY, e))
    ;(l.material as THREE.LineDashedMaterial).opacity = 0.3 * e
  })

  return <primitive ref={ref} object={line} />
}

/**
 * One chapter (orbit) as a crater moon with a halo and a name tag. userData.orbitNumber says which chapter a click hit.
 * The colour eases towards the state's colour; the current chapter pulses (as in the prototype's drawMoons).
 * Publishes its world position in chapterPositions so the camera can fly to it.
 */
function ChapterMoon({ index, count, orbitNumber, title, state, active, orbitClock, onSelect }: {
  index: number; count: number; orbitNumber: number; title: string; state: ChapterState
  /** zoomed in on this planet: label shown and clickable */
  active: boolean
  orbitClock: OrbitClock
  onSelect: (orbitNumber: number) => void
}) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const surfaceMat = useRef<THREE.MeshStandardMaterial>(null)
  const glowMat = useRef<THREE.SpriteMaterial>(null)
  const hovered = useRef(false)
  const surface = useMemo(() => craterTex(100 + index * 13), [index])
  const glow = useMemo(() => glowTex(), [])
  // start in the locked colour so the first state change already eases in
  const col = useMemo(() => STATE_COLOR.locked.clone(), [])
  const clickable = active && state !== 'locked'
  useEffect(() => () => { surface.dispose(); glow.dispose() }, [surface, glow])
  // don't leave a pointer cursor behind if the moon unmounts while hovered
  useEffect(() => () => { if (hovered.current) document.body.style.cursor = '' }, [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = group.current, m = surfaceMat.current, s = glowMat.current
    if (!g || !m || !s) return
    // emerge: out from the planet's centre to the ring, growing from nothing
    const e = emerged()
    g.visible = e > TINY
    g.position.set(...chapterPosition(index, count, orbitClock.current)).multiplyScalar(e)
    g.getWorldPosition(chapterPositions[orbitNumber] ??= new THREE.Vector3())
    if (body.current) body.current.rotation.y += dt * 0.3

    col.lerp(STATE_COLOR[state], Math.min(1, dt * 4))
    const isCurrent = state === 'current', isLocked = state === 'locked'
    const pulse = isCurrent ? 0.3 + 0.3 * Math.sin(t * 3) : 0
    const lift = hovered.current && clickable ? 0.25 : 0
    m.emissive.copy(col)
    m.emissiveIntensity = (isLocked ? 0.12 : 0.35) + pulse * 0.5 + lift
    s.color.copy(col)
    s.opacity = (isLocked ? 0.15 : 0.45) + pulse + lift * 0.6
    g.scale.setScalar(Math.max(TINY, e) * (1 + (isCurrent ? 0.08 * Math.sin(t * 3) : 0)))
  })

  return (
    <group ref={group} visible={false} scale={TINY}>
      <mesh
        ref={body}
        userData={{ orbitNumber }}
        // while hidden, clicks pass through to whatever is behind (e.g. Home's planet)
        onClick={(e) => {
          if (!active || e.delta > DRAG_PX) return
          e.stopPropagation()
          onSelect(orbitNumber)
        }}
        onPointerOver={(e) => {
          if (!active) return
          e.stopPropagation()
          hovered.current = true
          if (clickable) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          if (!hovered.current) return
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
      {/* always mounted (unmounting drei <Html> mid-frame can crash); faded out while the moons are hidden; below the HUD (z-20) */}
      <Html portal={universeLabelRoot} position={[0, 1.6, 0]} zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none', opacity: active ? 1 : 0, transition: 'opacity .3s' }}>
        <ChapterLabel number={orbitNumber} title={title} state={state} />
      </Html>
    </group>
  )
}

/** Cone halfway between chapter `index` and the next, pointing along the ring (the reading order). Mint once chapter `index` is done. */
function ChapterArrow({ index, count, done, orbitClock }: { index: number; count: number; done: boolean; orbitClock: OrbitClock }) {
  const cone = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const m = cone.current
    if (!m || !mat.current) return
    const e = emerged()
    const a = arrowAngle(index, count, orbitClock.current)
    const r = MOON_ORBIT_RADIUS * e
    m.visible = e > TINY
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
    m.quaternion.setFromUnitVectors(UP, dir.set(-Math.sin(a), 0, Math.cos(a)))
    m.scale.setScalar(Math.max(TINY, e))
    mat.current.opacity = 0.7 * e
  })

  return (
    <mesh ref={cone} visible={false} raycast={() => null}>
      <coneGeometry args={[0.28, 0.75, 14]} />
      <meshBasicMaterial ref={mat} color={done ? MINT : SKY} transparent opacity={0} />
    </mesh>
  )
}

export interface MoonSystemProps {
  planet: Planet
  /** one state per orbit, in the same order as planet.orbits */
  states: ChapterState[]
  onSelectChapter: (orbitNumber: number) => void
}

export function MoonSystem({ planet, states, onSelectChapter }: MoonSystemProps) {
  // the moon data's planet id matches Home's planet ids ('blockchain')
  const planetId = planet.id as PlanetId
  const planetRadius = HOME_PLANETS.find((p) => p.id === planetId)?.radius ?? 2.6
  const view = useView((s) => s.view)
  const zoomedIn = useView((s) => s.zoomedIn)
  const paused = useView((s) => s.chapter !== null)
  // labels and clicks only once essentially at this planet (live.zoom ~1); the moons themselves follow live.zoom
  const active = view.mode === 'planet' && view.id === planetId && zoomedIn

  const root = useRef<THREE.Group>(null)
  const orbitClock = useRef(0)
  const count = planet.orbits.length

  useFrame((_, dt) => {
    const p = planetPositions[planetId]
    if (p) root.current?.position.copy(p)
    // orbits freeze while a chapter is focused
    if (!paused) orbitClock.current += dt
  })

  return (
    <group ref={root}>
      <group scale={MOON_SYSTEM_SCALE}>
        {/* invisible stand-in for Home's planet: blocks clicks and hovers on moons behind it (only while active,
            otherwise it would swallow clicks meant for the planet itself) */}
        {active && (
          <mesh onClick={stop} onPointerOver={stop}>
            <sphereGeometry args={[planetRadius / MOON_SYSTEM_SCALE, 24, 16]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        )}
        <group rotation-x={MOON_ORBIT_TILT}>
          <OrbitLine />
          {planet.orbits.map((orbit, i) => (
            <ChapterMoon
              key={orbit.number}
              index={i}
              count={count}
              orbitNumber={orbit.number}
              title={orbit.title}
              state={states[i]}
              active={active}
              orbitClock={orbitClock}
              onSelect={onSelectChapter}
            />
          ))}
          {planet.orbits.slice(0, -1).map((orbit, i) => (
            <ChapterArrow key={orbit.number} index={i} count={count} done={states[i] === 'completed'} orbitClock={orbitClock} />
          ))}
        </group>
      </group>
    </group>
  )
}
