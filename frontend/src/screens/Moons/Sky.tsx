/**
 * Starfield, nebula clouds and the far-off sun, ported from the prototype's addSky (moons scene).
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { radialTex, rawColor, rng, warmTex } from './textures'

/** [count, point size in px, colour] */
const STAR_LAYERS: [number, number, string][] = [[2600, 1.1, '#b9c6ff'], [800, 1.8, '#ffffff'], [160, 2.8, '#ffe2b8']]
/** [colour, position, size, opacity]. x is mirrored compared with Home, as in the prototype. */
const CLOUDS: [string, [number, number, number], number, number][] = [
  ['#1d6f80', [-320, 160, -560], 560, 0.2],
  ['#6b3a63', [460, -90, -460], 500, 0.16],
  ['#2a4c9a', [-60, -280, -640], 460, 0.14],
]

export function Sky() {
  const layers = useMemo(() => STAR_LAYERS.map(([n, size, col], k) => {
    const r = rng(101 + k * 977)
    const positions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, d = 800 + r() * 300, s = Math.sqrt(1 - u * u)
      positions[i * 3] = d * s * Math.cos(t)
      positions[i * 3 + 1] = d * u
      positions[i * 3 + 2] = d * s * Math.sin(t)
    }
    return { positions, size, color: rawColor(col) }
  }), [])
  const nebula = useMemo(() => radialTex([[0, 'rgba(255,255,255,.9)'], [0.4, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), [])
  const warm = useMemo(() => warmTex(), [])
  const cloudColors = useMemo(() => CLOUDS.map(([c]) => rawColor(c)), [])
  useEffect(() => () => { nebula.dispose(); warm.dispose() }, [nebula, warm])

  return (
    <>
      {layers.map((l, i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.positions, 3]} />
          </bufferGeometry>
          <pointsMaterial color={l.color} size={l.size} sizeAttenuation={false} transparent opacity={0.85} />
        </points>
      ))}
      {CLOUDS.map(([, pos, size, opacity], i) => (
        <sprite key={i} position={pos} scale={[size, size, 1]}>
          <spriteMaterial map={nebula} color={cloudColors[i]} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      {/* the sun, far away in the direction the planet is lit from */}
      <sprite position={[-520, 240, 340]} scale={[160, 160, 1]}>
        <spriteMaterial map={warm} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  )
}
