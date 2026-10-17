import { useMemo } from 'react'
import * as THREE from 'three'
import { radialTexture } from './textures'

/** Same little random generator every time, so the sky looks identical on each visit. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

// three layers of stars: many tiny bluish ones, some white ones, a few big warm ones
const LAYERS: [count: number, size: number, color: string][] = [
  [2600, 1.1, '#b9c6ff'],
  [800, 1.8, '#ffffff'],
  [160, 2.8, '#ffe2b8'],
]

// soft coloured clouds far behind everything
const CLOUDS: [color: string, pos: [number, number, number], size: number, opacity: number][] = [
  ['#1d6f80', [320, 160, -560], 560, 0.2],
  ['#6b3a63', [-460, -90, -460], 500, 0.16],
  ['#2a4c9a', [60, -280, -640], 460, 0.14],
]

/** Crisp pin-point stars on a far-away sphere plus faint nebula clouds. */
export function Sky() {
  const layers = useMemo(() => {
    const rnd = seeded(42)
    return LAYERS.map(([count, size, color]) => {
      const p = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 800 + rnd() * 300, s = Math.sqrt(1 - u * u)
        p[i * 3] = r * s * Math.cos(t)
        p[i * 3 + 1] = r * u
        p[i * 3 + 2] = r * s * Math.sin(t)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3))
      return { geo, size, color }
    })
  }, [])
  const cloud = useMemo(() => radialTexture([[0, 'rgba(255,255,255,.9)'], [0.4, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), [])

  return (
    <>
      {layers.map(({ geo, size, color }, i) => (
        <points key={i} geometry={geo}>
          {/* sizeAttenuation off: every star stays a sharp dot of the same pixel size, like a real night sky */}
          <pointsMaterial color={color} size={size} sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} />
        </points>
      ))}
      {CLOUDS.map(([color, pos, size, opacity], i) => (
        <sprite key={i} position={pos} scale={size}>
          <spriteMaterial map={cloud} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  )
}
