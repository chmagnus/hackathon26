import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ATMOSPHERE_SCALE, CLOUD_SCALE, earthAtmosphereMaterial, earthCloudMaterial, earthSurfaceMaterial } from './earthMaterials'
import { prepareTexture, textureUrl } from './textureSet'

/** NASA textures (sources in the README's CREDITS), in this order. */
const EARTH_URLS = ['day', 'night', 'clouds', 'normal', 'ocean_mask'].map((name) => textureUrl(`earth_${name}`))
// start downloading as soon as the app loads
useTexture.preload(EARTH_URLS)

const SURFACE_SPIN = 0.06 // radians per second, same as the other planets
const CLOUD_SPIN = 0.075

function prepareTextures([day, night, clouds, normal, ocean]: THREE.Texture[]) {
  for (const t of [day, night, clouds]) prepareTexture(t, true)
  for (const t of [normal, ocean]) prepareTexture(t, false)
  clouds.wrapS = THREE.RepeatWrapping // the cloud layer slides east-west over the ground
}

/** The Blockchain planet as a photoreal Earth: ground, clouds and atmosphere. Suspends while the textures load. */
export function EarthBody({ radius, onClick }: { radius: number; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const [day, night, clouds, normal, ocean] = useTexture(EARTH_URLS, prepareTextures)
  const surface = useRef<THREE.Mesh>(null)
  const cloudLayer = useRef<THREE.Mesh>(null)

  const surfaceMat = useMemo(() => earthSurfaceMaterial({ day, night, clouds, normal, ocean }), [day, night, clouds, normal, ocean])
  const cloudMat = useMemo(() => earthCloudMaterial(clouds), [clouds])
  const atmosphereMat = useMemo(() => earthAtmosphereMaterial(), [])
  useEffect(() => () => { surfaceMat.dispose(); cloudMat.dispose(); atmosphereMat.dispose() }, [surfaceMat, cloudMat, atmosphereMat])

  useFrame((_, dt) => {
    const s = surface.current, c = cloudLayer.current
    if (!s || !c) return
    s.rotation.y += dt * SURFACE_SPIN
    c.rotation.y += dt * CLOUD_SPIN
    // how far the clouds have turned past the ground, in texture widths, for the cloud shadows
    ;(s.material as THREE.Material).userData.cloudShift.value = ((s.rotation.y - c.rotation.y) / (2 * Math.PI)) % 1
  })

  return (
    <>
      <mesh
        ref={surface}
        material={surfaceMat}
        onClick={onClick}
        onPointerOver={() => { if (onClick) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[radius, 96, 64]} />
      </mesh>
      {/* drawn before the ring (renderOrder 1), so the ring stays in front of the clouds */}
      <mesh ref={cloudLayer} material={cloudMat} raycast={() => null} renderOrder={0}>
        <sphereGeometry args={[radius * CLOUD_SCALE, 96, 64]} />
      </mesh>
      <mesh material={atmosphereMat} raycast={() => null} renderOrder={2}>
        <sphereGeometry args={[radius * ATMOSPHERE_SCALE, 96, 64]} />
      </mesh>
    </>
  )
}
