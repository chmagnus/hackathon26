/**
 * The one camera for the Universe (drei CameraControls).
 *  - universe mode: intro fly-in to the overview, slow auto-rotate, drag to orbit and scroll to zoom (Home's old behaviour)
 *  - planet mode: one continuous flight to PLANET_VIEW_DISTANCE from the planet, then follows the planet as it drifts
 *  - planet mode + chapter: flies to MOON_VIEW_DISTANCE from that chapter's moon and follows it
 * Driven by useView(); marks `arrived` / `chapterArrived` once the camera gets there.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import * as THREE from 'three'
import { chapterPositions, planetPositions, useView } from './view'

/** Overview position on a wide screen (pulled back on tall/narrow ones). */
const START = new THREE.Vector3(0, 38, 84)
/** How far from the planet the camera ends up in planet mode. */
const PLANET_VIEW_DISTANCE = 21
/** How far from a focused moon, and how high above its ring (radians). */
const MOON_VIEW_DISTANCE = 7
const MOON_VIEW_ELEVATION = 0.32
/** Home's old OrbitControls autoRotateSpeed 0.25, in radians per second. */
const AUTO_ROTATE = ((2 * Math.PI) / 60) * 0.25
const UNIVERSE_DISTANCE: [number, number] = [30, 260]
const PLANET_DISTANCE: [number, number] = [10, 60]
const MOON_DISTANCE: [number, number] = [3, 20]
/** If the user zooms during a flight it may never hit the distance exactly; count it as arrived after this long. */
const ARRIVE_TIMEOUT = 2.5

export function CameraRig() {
  const controls = useRef<CameraControlsImpl>(null)
  const view = useView((s) => s.view)
  const chapter = useView((s) => s.chapter)
  const get = useThree((s) => s.get)
  const dragging = useRef(false)
  const flightTime = useRef(0)
  const target = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    flightTime.current = 0
    if (view.mode === 'universe') {
      ;[c.minDistance, c.maxDistance] = UNIVERSE_DISTANCE
      // pull the camera back on tall/narrow screens so every planet still fits
      const { size } = get()
      const start = START.clone().multiplyScalar(Math.max(1, Math.pow(1.5 / (size.width / size.height), 0.72)))
      c.setLookAt(start.x, start.y, start.z, 0, 0, 0, true)
      return
    }
    const p = planetPositions[view.id]
    if (!p) return
    if (chapter === null) {
      ;[c.minDistance, c.maxDistance] = PLANET_DISTANCE
      // keep the current viewing direction, so it's one straight flight in (or back out from a moon)
      const end = c.camera.position.clone().sub(p).normalize().multiplyScalar(PLANET_VIEW_DISTANCE).add(p)
      c.setLookAt(end.x, end.y, end.z, p.x, p.y, p.z, true)
    } else {
      const m = chapterPositions[chapter]
      if (!m) return
      ;[c.minDistance, c.maxDistance] = MOON_DISTANCE
      // outside the ring, slightly above, so the planet sits behind the moon
      const out = m.clone().sub(p).setY(0)
      if (out.lengthSq() < 1e-6) out.set(0, 0, 1)
      out.normalize().multiplyScalar(MOON_VIEW_DISTANCE * Math.cos(MOON_VIEW_ELEVATION))
      const end = m.clone().add(out)
      end.y += MOON_VIEW_DISTANCE * Math.sin(MOON_VIEW_ELEVATION)
      c.setLookAt(end.x, end.y, end.z, m.x, m.y, m.z, true)
    }
  }, [view, chapter, get])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const s = useView.getState()

    if (s.view.mode === 'universe') {
      if (!dragging.current) c.rotate(-AUTO_ROTATE * dt, 0, false)
      return
    }

    // follow what we're looking at as it moves. Done by hand rather than moveTo(..., true),
    // which would queue a new 'rest' listener every frame.
    const follow = s.chapter !== null ? chapterPositions[s.chapter] : planetPositions[s.view.id]
    if (!follow) return
    c.getTarget(target)
    target.lerp(follow, Math.min(1, dt * 3))
    c.moveTo(target.x, target.y, target.z, false)

    const done = s.chapter !== null ? s.chapterArrived : s.arrived
    if (done) return
    flightTime.current += dt
    const distance = s.chapter !== null ? MOON_VIEW_DISTANCE : PLANET_VIEW_DISTANCE
    const close = target.distanceTo(follow) < 0.3 && Math.abs(c.distance - distance) < 0.5
    if (close || flightTime.current > ARRIVE_TIMEOUT) {
      if (s.chapter !== null) s.setChapterArrived()
      else s.setArrived()
    }
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
