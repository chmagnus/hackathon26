/**
 * The one camera for the Universe (drei CameraControls).
 *  - universe mode: intro fly-in to the overview, slow auto-rotate, drag to orbit and scroll to zoom (Home's old behaviour)
 *  - planet mode: one continuous flight to PLANET_VIEW_DISTANCE from the planet, then follows the planet as it drifts
 *  - planet mode + chapter: flies to MOON_VIEW_DISTANCE from that chapter's moon and follows it
 *    (READING_DISTANCE while a concept page is open over it)
 * Driven by useView(); marks `arrived` / `chapterArrived` once the camera gets there.
 * Also works out live.zoom every frame (and the zoomStarted / zoomedIn flags) for the fades.
 *
 * Flights are driven here, not by CameraControls' own transitions: each frame both the look-at target and the
 * camera's offset around it move by the same eased progress, aimed at where the planet/moon is right now. That way
 * the target glides to the planet (no snap) and the flight still lands on a moving target.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetId } from '../screens/Home/planets'
import { chapterPositions, live, planetPositions, useView } from './view'

/** Overview position on a wide screen (pulled back on tall/narrow ones). */
const START = new THREE.Vector3(0, 38, 84)
const ORIGIN = new THREE.Vector3(0, 0, 0)
/** How far from the planet the camera ends up in planet mode. */
const PLANET_VIEW_DISTANCE = 21
/** How far from a focused moon, and how high above its ring (radians). */
const MOON_VIEW_DISTANCE = 7
const MOON_VIEW_ELEVATION = 0.32
/** A little closer while a concept page is open over the moon, reached with a shorter ease. */
const READING_DISTANCE = 5
const READING_FLIGHT_SECONDS = 0.9
/** Home's old OrbitControls autoRotateSpeed 0.25, in radians per second. */
const AUTO_ROTATE = ((2 * Math.PI) / 60) * 0.25
const UNIVERSE_DISTANCE: [number, number] = [30, 260]
// capped at 30 so zooming out by hand in planet mode keeps live.zoom near 1 (the moons stay out)
const PLANET_DISTANCE: [number, number] = [10, 30]
const MOON_DISTANCE: [number, number] = [3, 20]
/** Length of every flight (in, out, to a moon and back), in seconds. */
const FLIGHT_SECONDS = 1.6

/** live.zoom: 0 at ZOOM_FAR or further from the planet, 1 at ZOOM_NEAR or closer. */
const ZOOM_FAR = 60
const ZOOM_NEAR = 25
/** [on, off] thresholds for the flags, with a gap so they don't flicker around one value */
const ZOOM_STARTED: [number, number] = [0.08, 0.03]
const ZOOMED_IN: [number, number] = [0.97, 0.9]

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

/**
 * live.zoom from the camera's distance to the planet being visited. In universe mode it may only fall: it runs
 * in reverse while flying out, but moving close to a planet by hand on the overview never brings the moons out.
 */
function updateZoom(camera: THREE.Camera, planetId: PlanetId | null) {
  const s = useView.getState()
  const p = planetId ? planetPositions[planetId] : undefined
  const z = p ? smoothstep(ZOOM_FAR, ZOOM_NEAR, camera.position.distanceTo(p)) : 0
  live.zoom = s.view.mode === 'planet' ? z : Math.min(live.zoom, z)

  const zoomStarted = live.zoom > ZOOM_STARTED[s.zoomStarted ? 1 : 0]
  const zoomedIn = s.zoomedIn ? live.zoom > ZOOMED_IN[1] : live.zoom >= ZOOMED_IN[0]
  if (zoomStarted !== s.zoomStarted || zoomedIn !== s.zoomedIn) s.setZoomFlags({ zoomStarted, zoomedIn })
}

interface Flight {
  elapsed: number
  duration: number
  /** where the camera was looking from/at when the flight started */
  fromTarget: THREE.Vector3
  fromOffset: THREE.Spherical
  /** where it should end up, worked out again every frame because planets and moons keep moving */
  to: () => { target: THREE.Vector3; offset: THREE.Vector3 } | null
  /** distance limits to apply once the flight is over (lifted during it so nothing gets clamped mid-air) */
  limits: [number, number]
  onDone?: () => void
}

export function CameraRig() {
  const controls = useRef<CameraControlsImpl>(null)
  const view = useView((s) => s.view)
  const chapter = useView((s) => s.chapter)
  const reading = useView((s) => s.reading)
  const get = useThree((s) => s.get)
  /** view/chapter of the previous flight, to tell a reading-only change (short ease) from a real flight */
  const lastFlight = useRef<{ view: unknown; chapter: number | null }>({ view: null, chapter: null })
  const dragging = useRef(false)
  const flight = useRef<Flight | null>(null)
  /** the planet live.zoom is measured against: the one being visited, or the last one after flying back out */
  const zoomPlanet = useRef<PlanetId | null>(null)
  const tmp = useMemo(() => ({
    target: new THREE.Vector3(), position: new THREE.Vector3(), offset: new THREE.Vector3(), spherical: new THREE.Spherical(),
  }), [])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const fromTarget = c.getTarget(new THREE.Vector3(), false)
    const fromPosition = c.getPosition(new THREE.Vector3(), false)
    const fromOffset = new THREE.Spherical().setFromVector3(fromPosition.clone().sub(fromTarget))
    // only `reading` changed: a short ease closer to (or back from) the moon rather than a full flight
    const readingOnly = lastFlight.current.view === view && lastFlight.current.chapter === chapter
    lastFlight.current = { view, chapter }
    const duration = readingOnly ? READING_FLIGHT_SECONDS : FLIGHT_SECONDS
    const start = (to: Flight['to'], limits: [number, number], onDone?: () => void) => {
      ;[c.minDistance, c.maxDistance] = [0, Infinity]
      flight.current = { elapsed: 0, duration, fromTarget, fromOffset, to, limits, onDone }
    }

    if (view.mode === 'universe') {
      // pull the camera back on tall/narrow screens so every planet still fits
      const { size } = get()
      const overview = START.clone().multiplyScalar(Math.max(1, Math.pow(1.5 / (size.width / size.height), 0.72)))
      start(() => ({ target: ORIGIN, offset: overview }), UNIVERSE_DISTANCE)
      return
    }

    const id = view.id
    const p0 = planetPositions[id]
    if (!p0) return
    if (chapter === null) {
      // keep the current viewing direction, so it's one straight flight in (or back out from a moon)
      const offset = fromPosition.clone().sub(p0).normalize().multiplyScalar(PLANET_VIEW_DISTANCE)
      start(() => {
        const p = planetPositions[id]
        return p ? { target: p, offset } : null
      }, PLANET_DISTANCE, useView.getState().setArrived)
    } else {
      const m0 = chapterPositions[chapter]
      if (!m0) return
      // outside the ring, slightly above, so the planet sits behind the moon
      const offset = m0.clone().sub(p0).setY(0)
      if (offset.lengthSq() < 1e-6) offset.set(0, 0, 1)
      const distance = reading ? READING_DISTANCE : MOON_VIEW_DISTANCE
      offset.normalize().multiplyScalar(distance * Math.cos(MOON_VIEW_ELEVATION))
      offset.y = distance * Math.sin(MOON_VIEW_ELEVATION)
      start(() => {
        const m = chapterPositions[chapter]
        return m ? { target: m, offset } : null
      }, MOON_DISTANCE, useView.getState().setChapterArrived)
    }
  }, [view, chapter, reading, get])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const s = useView.getState()
    if (s.view.mode === 'planet') zoomPlanet.current = s.view.id
    updateZoom(c.camera, zoomPlanet.current)

    // flying: target and offset both move by the same eased progress towards where the destination is now
    const f = flight.current
    if (f) {
      const end = f.to()
      if (!end) return
      f.elapsed += dt
      const k = Math.min(1, f.elapsed / f.duration)
      const u = easeInOutCubic(k)
      const { target, position, offset, spherical } = tmp
      target.lerpVectors(f.fromTarget, end.target, u)
      // swing around the moving target in spherical coordinates (shortest way round), like CameraControls did
      spherical.setFromVector3(end.offset)
      let dTheta = spherical.theta - f.fromOffset.theta
      dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta))
      spherical.set(
        THREE.MathUtils.lerp(f.fromOffset.radius, spherical.radius, u),
        THREE.MathUtils.lerp(f.fromOffset.phi, spherical.phi, u),
        f.fromOffset.theta + dTheta * u,
      )
      position.copy(target).add(offset.setFromSpherical(spherical))
      c.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false)
      if (k >= 1) {
        flight.current = null
        ;[c.minDistance, c.maxDistance] = f.limits
        f.onDone?.()
      }
      return
    }

    if (s.view.mode === 'universe') {
      if (!dragging.current) c.rotate(-AUTO_ROTATE * dt, 0, false)
      return
    }

    // arrived: keep the target on the drifting planet/moon. Done by hand rather than moveTo(..., true),
    // which would queue a new 'rest' listener every frame. getTarget(..., false) reads the current target, not the end one.
    const follow = s.chapter !== null ? chapterPositions[s.chapter] : planetPositions[s.view.id]
    if (!follow) return
    const { target } = tmp
    c.getTarget(target, false)
    target.lerp(follow, Math.min(1, dt * 3))
    c.moveTo(target.x, target.y, target.z, false)
  })

  const A = CameraControlsImpl.ACTION
  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={0.5}
      maxPolarAngle={Math.PI * 0.8}
      mouseButtons={{ left: A.ROTATE, middle: A.DOLLY, right: A.NONE, wheel: A.DOLLY }}
      touches={{ one: A.TOUCH_ROTATE, two: A.TOUCH_DOLLY, three: A.NONE }}
      // auto-rotate pauses while the user is dragging, like OrbitControls
      onStart={() => { dragging.current = true }}
      onEnd={() => { dragging.current = false }}
    />
  )
}
