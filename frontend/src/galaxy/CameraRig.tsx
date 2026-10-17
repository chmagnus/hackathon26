/**
 * The one camera for the Universe (drei CameraControls).
 *  - universe mode: intro fly-in to the overview, slow auto-rotate, drag to orbit and scroll to zoom (Home's old behaviour)
 *  - planet mode: one continuous flight to FLY_DISTANCE from the planet, then follows the planet as it drifts
 * Driven by useView(); marks `arrived` once the camera has reached the planet.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import * as THREE from 'three'
import { planetPositions, useView } from './view'

/** Overview position on a wide screen (pulled back on tall/narrow ones). */
const START = new THREE.Vector3(0, 38, 84)
/** How far from the planet the camera ends up in planet mode. */
const FLY_DISTANCE = 21
/** Home's old OrbitControls autoRotateSpeed 0.25, in radians per second. */
const AUTO_ROTATE = ((2 * Math.PI) / 60) * 0.25
const UNIVERSE_DISTANCE: [number, number] = [30, 260]
const PLANET_DISTANCE: [number, number] = [10, 60]
/** If the user zooms during the flight it may never hit FLY_DISTANCE exactly; count it as arrived after this long. */
const ARRIVE_TIMEOUT = 2.5

export function CameraRig() {
  const controls = useRef<CameraControlsImpl>(null)
  const view = useView((s) => s.view)
  const get = useThree((s) => s.get)
  const dragging = useRef(false)
  const planetModeTime = useRef(0)
  const target = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    planetModeTime.current = 0
    if (view.mode === 'universe') {
      ;[c.minDistance, c.maxDistance] = UNIVERSE_DISTANCE
      // pull the camera back on tall/narrow screens so every planet still fits
      const { size } = get()
      const start = START.clone().multiplyScalar(Math.max(1, Math.pow(1.5 / (size.width / size.height), 0.72)))
      c.setLookAt(start.x, start.y, start.z, 0, 0, 0, true)
    } else {
      const p = planetPositions[view.id]
      if (!p) return
      ;[c.minDistance, c.maxDistance] = PLANET_DISTANCE
      // keep the current viewing direction, so it's one straight flight in
      const end = c.camera.position.clone().sub(p).normalize().multiplyScalar(FLY_DISTANCE).add(p)
      c.setLookAt(end.x, end.y, end.z, p.x, p.y, p.z, true)
    }
  }, [view, get])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const { view, arrived, setArrived } = useView.getState()

    if (view.mode === 'universe') {
      if (!dragging.current) c.rotate(-AUTO_ROTATE * dt, 0, false)
      return
    }

    // planet mode: keep the target on the drifting planet. Done by hand rather than moveTo(..., true),
    // which would queue a new 'rest' listener every frame.
    const p = planetPositions[view.id]
    if (!p) return
    c.getTarget(target)
    target.lerp(p, Math.min(1, dt * 3))
    c.moveTo(target.x, target.y, target.z, false)

    if (!arrived) {
      planetModeTime.current += dt
      const close = target.distanceTo(p) < 0.3 && Math.abs(c.distance - FLY_DISTANCE) < 0.5
      if (close || planetModeTime.current > ARRIVE_TIMEOUT) setArrived()
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
