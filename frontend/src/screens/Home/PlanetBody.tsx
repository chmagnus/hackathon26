import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { HomePlanet } from './planets'
import { ATMO_FRAG, PLANET_FRAG, PLANET_VERT } from './shaders'
import { ringTexture } from './textures'

const STAR = new THREE.Vector3(0, 0, 0)

/** One procedurally shaded planet (surface + glowing atmosphere + optional ring), lit by the star. */
export function PlanetBody({ planet, onClick }: { planet: HomePlanet; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const surface = useRef<THREE.Mesh>(null)
  const { shade, radius } = planet

  const surfaceMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
    uniforms: {
      uType: { value: shade.type }, uT: { value: 0 }, uSeed: { value: shade.seed }, uLight: { value: STAR.clone() },
      uA: { value: new THREE.Color(shade.a) }, uB: { value: new THREE.Color(shade.b) }, uC: { value: new THREE.Color(shade.c) }, uD: { value: new THREE.Color(shade.d) },
      uCity: { value: new THREE.Color(shade.city) }, uAtm: { value: new THREE.Color(shade.atm) },
    },
  }), [shade])

  const atmosphereMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT,
    fragmentShader: ATMO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uLight: { value: STAR.clone() }, uAtm: { value: new THREE.Color(shade.atm) } },
  }), [shade])

  useEffect(() => () => { surfaceMat.dispose(); atmosphereMat.dispose() }, [surfaceMat, atmosphereMat])

  // Ring: remap UVs so the texture runs from the inner edge (u=0) to the outer edge (u=1),
  // then use a banded, partly see-through texture like Saturn's rings.
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
  const ringTex = useMemo(() => ringTexture(planet.color), [planet.color])

  useFrame((state, dt) => {
    const m = surface.current
    if (!m) return
    ;(m.material as THREE.ShaderMaterial).uniforms.uT.value = state.clock.elapsedTime
    m.rotation.y += dt * 0.06 // real planets turn slowly
  })

  return (
    <group>
      <mesh
        ref={surface}
        material={surfaceMat}
        onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[radius, 64, 48]} />
      </mesh>
      {/* fixed draw order for the see-through layers stops them flickering as the camera moves */}
      <mesh material={atmosphereMat} raycast={() => null} renderOrder={2}>
        <sphereGeometry args={[radius * 1.035, 64, 48]} />
      </mesh>
      {planet.ring && (
        <mesh rotation-x={1.25} geometry={ringGeo} raycast={() => null} renderOrder={1}>
          <meshStandardMaterial map={ringTex} transparent side={THREE.DoubleSide} depthWrite={false} roughness={1} />
        </mesh>
      )}
    </group>
  )
}
