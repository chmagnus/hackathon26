/**
 * The moon system, drawn inside the shared Universe around Home's planet (ported from the prototype's moons scene):
 * one moon (NASA CGI Moon Kit surface) per chapter on a tilted dashed ring, arrows between consecutive chapters, state colours and pulse.
 * Lit by Home's star like everything else. Follows the planet as it drifts.
 *
 * The moons "emerge" from the planet as the camera flies in: ring radius and moon size grow with live.zoom,
 * the dashed ring and arrows fade in with it, and it all runs in reverse on the way out. Moons are scaled only,
 * never made see-through, to avoid sorting glitches. Labels and clicks only once zoomed in. While a chapter is
 * focused the orbits pause.
 */
import { Suspense, useEffect, useMemo, useRef, type Ref, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { universeLabelRoot } from '../../galaxy/labelRoot'
import { chapterPositions, live, planetPositions, REDUCED_MOTION, useView } from '../../galaxy/view'
import { RIM_COLOR, rimGlsl } from '../Home/lighting'
import { HOME_PLANETS, type PlanetId } from '../Home/planets'
import { TextureLoadingOverlay } from '../Home/TextureLoadingOverlay'
import { prepareTexture, textureUrl } from '../Home/textureSet'
import { ChapterLabel } from './ChapterLabel'
import type { ChapterState } from './chapters'
import { arrowAngle, chapterPosition, MOON_ORBIT_RADIUS, MOON_ORBIT_TILT, MOON_SYSTEM_SCALE } from './layout'
import { glowTex } from './textures'
import type { Planet } from './types'

const SKY = new THREE.Color('#7cc4ff')
const MINT = new THREE.Color('#6ff2c5')
/** a chapter whose lessons no longer match the hash chain, whatever its state */
const CORAL = new THREE.Color('#ff7b72')

/** State colour of each chapter's halo, rim and tint: mint done, gold current, dim cool grey locked. */
const STATE_COLOR: Record<ChapterState, THREE.Color> = {
  completed: MINT,
  current: new THREE.Color('#ffcf5a'),
  locked: new THREE.Color('#6a7488'),
}
/** How much of the state colour tints the real moon surface (the halo carries most of the state). */
const TINT = 0.2
const WHITE = new THREE.Color(1, 1, 1)
/** Small glow every moon has whatever its state, so its night side is never black. */
const BASE_EMISSIVE = new THREE.Color('#2a3249')

/** NASA's CGI Moon Kit: LROC colour and a normal map from LOLA elevation (README CREDITS). */
const MOON_URLS = [textureUrl('moon'), textureUrl('moon_normal')]
// start downloading as soon as the app loads
useTexture.preload(MOON_URLS)
function prepareMoonTextures([map, normal]: THREE.Texture[]) {
  prepareTexture(map, true)
  prepareTexture(normal, false)
}
const MOON_RADIUS = 1.05
const UP = new THREE.Vector3(0, 1, 0)
/** Pointer moves bigger than this (px) between press and release count as a drag, not a click. */
const DRAG_PX = 6

const glslColor = (c: THREE.Color) => `vec3(${c.toArray().map((v) => v.toFixed(4)).join(', ')})`

/**
 * Fresnel rim (lighting.ts) tinted by the moon's own glow: three's `emissive` uniform is the base glow plus the state
 * colour times its intensity, so mint / gold / dim also show in the outline, and the current moon's rim pulses with it.
 */
function addMoonRim(shader: THREE.WebGLProgramParametersWithUniforms) {
  const rim = `${glslColor(RIM_COLOR)} + max(emissive - ${glslColor(BASE_EMISSIVE)}, vec3(0.0)) * 3.0`
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `${rimGlsl(rim)}\n#include <opaque_fragment>`)
}

/** The real moon surface, shared by every chapter moon. Suspends while the textures load. */
function MoonMaterial({ ref }: { ref: Ref<THREE.MeshStandardMaterial> }) {
  const [map, normal] = useTexture(MOON_URLS, prepareMoonTextures)
  return <meshStandardMaterial ref={ref} map={map} normalMap={normal} roughness={0.95} metalness={0} onBeforeCompile={addMoonRim} />
}

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
 * One chapter (orbit) as a real-looking moon with a halo and a name tag. userData.orbitNumber says which chapter a click
 * hit. Each moon is turned differently so they don't look identical. The state colour (eased towards) shows in the halo,
 * the rim and a light tint; the current chapter pulses (as in the prototype's drawMoons).
 * Publishes its world position in chapterPositions so the camera can fly to it.
 */
function ChapterMoon({ index, count, orbitNumber, title, state, broken, active, orbitClock, onSelect }: {
  index: number; count: number; orbitNumber: number; title: string; state: ChapterState
  /** a lesson in this chapter no longer matches the hash chain */
  broken: boolean
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
  const glow = useMemo(() => glowTex(), [])
  // each moon shows a different face, tilted a little differently
  const turn = useMemo(() => [((index * 0.61) % 1 - 0.5) * 0.8, index * 2.4, ((index * 0.37) % 1 - 0.5) * 0.6] as const, [index])
  // start in the locked colour so the first state change already eases in
  const col = useMemo(() => STATE_COLOR.locked.clone(), [])
  const clickable = active && state !== 'locked'
  useEffect(() => () => glow.dispose(), [glow])
  // don't leave a pointer cursor behind if the moon unmounts while hovered
  useEffect(() => () => { if (hovered.current) document.body.style.cursor = '' }, [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = group.current, m = surfaceMat.current, s = glowMat.current
    if (!g || !m || !s) return
    // emerge: out from the planet's centre to the ring, growing from nothing
    const e = emerged()
    g.visible = e > TINY
    chapterPosition(index, count, orbitClock.current, g.position).multiplyScalar(e)
    g.getWorldPosition(chapterPositions[orbitNumber] ??= new THREE.Vector3())
    if (body.current) body.current.rotation.y += dt * 0.3

    col.lerp(broken ? CORAL : STATE_COLOR[state], Math.min(1, dt * 4))
    // a broken chapter glows even when locked, so the break is visible all the way round
    const isCurrent = state === 'current', isLocked = state === 'locked' && !broken
    const pulse = isCurrent ? 0.3 + 0.3 * Math.sin(t * 3) : 0
    const lift = hovered.current && clickable ? 0.25 : 0
    m.color.copy(WHITE).lerp(col, TINT)
    if (isLocked) m.color.multiplyScalar(0.8)
    m.emissive.copy(col).multiplyScalar(isLocked ? 0.02 : 0.06 + pulse * 0.25 + lift * 0.4).add(BASE_EMISSIVE)
    s.color.copy(col)
    s.opacity = (isLocked ? 0.15 : 0.45) + pulse + lift * 0.6
    g.scale.setScalar(Math.max(TINY, e) * (1 + (isCurrent ? 0.08 * Math.sin(t * 3) : 0)))
  })

  return (
    <group ref={group} visible={false} scale={TINY}>
      <mesh
        ref={body}
        rotation={turn}
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
        {/* until it's loaded there's no material, and the moon stays hidden (useFrame below needs it) */}
        <Suspense fallback={<TextureLoadingOverlay />}>
          <MoonMaterial ref={surfaceMat} />
        </Suspense>
      </mesh>
      <sprite scale={[4.4, 4.4, 1]} raycast={() => null}>
        <spriteMaterial ref={glowMat} map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* always mounted (unmounting drei <Html> mid-frame can crash); faded out while the moons are hidden; below the HUD (z-20) */}
      <Html portal={universeLabelRoot} position={[0, 1.6, 0]} zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none', opacity: active ? 1 : 0, transition: 'opacity .3s' }}>
        <ChapterLabel number={orbitNumber} title={title} state={state} broken={broken} />
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
  /** per orbit, like states: true when a lesson in it no longer matches the hash chain */
  broken?: boolean[]
  onSelectChapter: (orbitNumber: number) => void
}

export function MoonSystem({ planet, states, broken, onSelectChapter }: MoonSystemProps) {
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
              broken={!!broken?.[i]}
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
