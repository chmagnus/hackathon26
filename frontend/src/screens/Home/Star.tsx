import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { STAR_LIGHT } from './lighting'
import { GLOW_FRAG, GLOW_VERT, SUN_FRAG, SUN_VERT } from './sunShaders'

/**
 * Glow layers: a tight warm glow just around the disc, and a very faint wide orange haze. Both stay below the bloom
 * threshold, so the glow is ours rather than bloom saturation. [reach in star radii, colour, intensity]
 */
const GLOW: [number, string, number][] = [
  [1.5, '#ffb347', 0.8],
  [4, '#ff8a3d', 0.06],
]

/** The user's star: a warm, churning plasma surface, a soft glow, and the light that shines on the planets. */
export function Star({ radius = 4 }: { radius?: number }) {
  const surfaceMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SUN_VERT,
    fragmentShader: SUN_FRAG,
    uniforms: { uTime: { value: 0 } },
  }), [])
  const glowMats = useMemo(() => GLOW.map(([extent, color, intensity]) => new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uExtent: { value: extent }, uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })), [])
  useEffect(() => () => { surfaceMat.dispose(); glowMats.forEach((m) => m.dispose()) }, [surfaceMat, glowMats])

  const body = useRef<THREE.Mesh>(null)
  const layers = useRef<THREE.Mesh[]>([])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (body.current) (body.current.material as THREE.ShaderMaterial).uniforms.uTime.value = t
    for (let i = 0; i < layers.current.length; i++) {
      // a very slow, slight breathing
      ;(layers.current[i].material as THREE.ShaderMaterial).uniforms.uIntensity.value = GLOW[i][2] * (1 + Math.sin(t * 0.9 + i * 2.1) * 0.03)
    }
  })

  return (
    <group>
      <pointLight color={STAR_LIGHT.color} intensity={STAR_LIGHT.intensity} distance={0} decay={0} />
      <mesh ref={body} material={surfaceMat}>
        <sphereGeometry args={[radius, 64, 48]} />
      </mesh>
      <Billboard>
        {GLOW.map(([extent], i) => (
          <mesh key={i} ref={(el) => { if (el) layers.current[i] = el }} material={glowMats[i]} raycast={() => null} renderOrder={3 + i}>
            <planeGeometry args={[radius * extent * 2, radius * extent * 2]} />
          </mesh>
        ))}
      </Billboard>
    </group>
  )
}
