import { Suspense, useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { HomePlanet } from './planets'
import { EarthBody } from './EarthBody'
import { PLANET_LOOKS } from './planetLooks'
import { ringMaterial } from './ringMaterial'
import { prepareTexture, textureUrl } from './textureSet'
import { TexturedPlanet } from './TexturedPlanet'
import { TextureLoadingOverlay } from './TextureLoadingOverlay'

/**
 * One planet lit by the star, with its optional ring. Each algorithm-planet looks like a real one, from NASA imagery
 * where it exists: Blockchain is the Earth (EarthBody), the others Neptune, Jupiter and Mars (planetLooks.ts).
 * Suspends while the textures load (the shared loading overlay covers it).
 */
export function PlanetBody({ planet, onClick }: { planet: HomePlanet; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  return (
    <group>
      <Suspense fallback={<TextureLoadingOverlay />}>
        {planet.id === 'blockchain'
          ? <EarthBody radius={planet.radius} onClick={onClick} />
          : <TexturedPlanet look={PLANET_LOOKS[planet.id]} radius={planet.radius} onClick={onClick} />}
        {planet.ring && <PlanetRing radius={planet.radius} />}
      </Suspense>
    </group>
  )
}

const RING_URL = textureUrl('ring')
useTexture.preload(RING_URL)
const prepareRing = (t: THREE.Texture) => prepareTexture(t, true)

/** Saturn's rings (texture with alpha) around the planet, lit by the star and crossed by the planet's shadow. */
function PlanetRing({ radius }: { radius: number }) {
  const ringTex = useTexture(RING_URL, prepareRing)
  // remap UVs so the texture runs from the inner edge (u=0) to the outer edge (u=1)
  const ringGeo = useMemo(() => {
    const inner = radius * 1.45, outer = radius * 2.3
    const g = new THREE.RingGeometry(inner, outer, 128, 1)
    const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
    }
    return g
  }, [radius])
  const material = useMemo(() => ringMaterial(ringTex, radius), [ringTex, radius])
  useEffect(() => () => { ringGeo.dispose(); material.dispose() }, [ringGeo, material])

  return <mesh rotation-x={1.25} geometry={ringGeo} material={material} raycast={() => null} renderOrder={1} />
}
