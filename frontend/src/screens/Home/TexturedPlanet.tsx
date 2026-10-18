import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { atmosphereMaterial } from './atmosphere'
import { RIM_COLOR, rimGlsl } from './lighting'
import { PLANET_LOOKS, type PlanetLook } from './planetLooks'
import { prepareTexture, textureUrl } from './textureSet'

// start downloading as soon as the app loads
for (const look of Object.values(PLANET_LOOKS)) useTexture.preload(urlsOf(look))

const SPIN = 0.06 // radians per second, same as the Earth
const RIM = `vec3(${RIM_COLOR.toArray().map((c) => c.toFixed(3)).join(', ')})`

function urlsOf(look: PlanetLook) {
  return [textureUrl(look.map), ...(look.normal ? [textureUrl(look.normal)] : [])]
}

function prepareTextures([map, normal]: THREE.Texture[]) {
  prepareTexture(map, true)
  map.wrapS = THREE.RepeatWrapping // so the band drift can slide across the seam
  if (normal) prepareTexture(normal, false)
}

// Differential rotation: each latitude's bands slide a little east or west and back again (slow, never accumulates),
// so neighbouring bands visibly shear against each other. uBandTime is in seconds.
const BAND_DRIFT_PARS = /* glsl */ `
uniform float uBandTime;`
const BAND_DRIFT_MAP = THREE.ShaderChunk.map_fragment.replace(
  'texture2D( map, vMapUv )',
  'texture2D( map, vMapUv + vec2(0.004 * sin(vMapUv.y * 41.0) * sin(uBandTime * 0.05 + vMapUv.y * 3.0), 0.0) )',
)

/**
 * A planet with a real colour map (and optionally a normal map) on a MeshStandardMaterial, lit like everything else
 * (star + soft fill, see lighting.ts) with the shared rim, inside a thin tinted atmosphere shell.
 * userData.bandTime is the band drift clock (set each frame).
 */
function planetMaterial(look: PlanetLook, map: THREE.Texture, normal?: THREE.Texture) {
  const bandTime = { value: 0 }
  const material = new THREE.MeshStandardMaterial({ map, normalMap: normal ?? null, roughness: 1, metalness: 0 })
  material.userData.bandTime = bandTime
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `${rimGlsl(RIM)}\n#include <opaque_fragment>`)
    if (look.bandDrift) {
      shader.uniforms.uBandTime = bandTime
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${BAND_DRIFT_PARS}`)
        .replace('#include <map_fragment>', BAND_DRIFT_MAP)
    }
  }
  material.customProgramCacheKey = () => `nova-planet${look.bandDrift ? '-bands' : ''}`
  return material
}

/** Neptune, Jupiter or Mars standing in for an algorithm-planet. Suspends while its textures load. */
export function TexturedPlanet({ look, radius, onClick }: { look: PlanetLook; radius: number; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const [map, normal] = useTexture(urlsOf(look), prepareTextures)
  const surface = useRef<THREE.Mesh>(null)
  const surfaceMat = useMemo(() => planetMaterial(look, map, normal), [look, map, normal])
  const atmosphereMat = useMemo(() => atmosphereMaterial(look.atmosphere), [look])
  useEffect(() => () => { surfaceMat.dispose(); atmosphereMat.dispose() }, [surfaceMat, atmosphereMat])

  useFrame((state, dt) => {
    const m = surface.current
    if (!m) return
    m.rotation.y += dt * SPIN
    ;(m.material as THREE.Material).userData.bandTime.value = state.clock.elapsedTime
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
      {/* fixed draw order for the see-through layers stops them flickering as the camera moves */}
      <mesh material={atmosphereMat} raycast={() => null} renderOrder={2}>
        <sphereGeometry args={[radius * look.atmosphere.scale, 96, 64]} />
      </mesh>
    </>
  )
}
