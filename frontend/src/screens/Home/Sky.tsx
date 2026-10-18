import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { radialTexture } from './textures'

/** Same little random generator every time, so the sky looks identical on each visit. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

const COUNT = 3600
/** Far behind everything, well inside the camera's far plane (4000). */
const RADIUS = 1000
/** Colour temperatures with how common each is: blue-white, white, pale yellow, faint orange. */
const TEMPERATURES: [weight: number, color: [number, number, number], brightness: number][] = [
  [0.3, [0.72, 0.82, 1.0], 1],
  [0.4, [1.0, 1.0, 1.0], 1],
  [0.22, [1.0, 0.94, 0.78], 0.95],
  [0.08, [1.0, 0.7, 0.45], 0.7],
]

// Every star is a round dot with a soft ~1px edge; a few bright ones also get a tiny glow, and some twinkle slowly.
// Sizes are in CSS pixels and scaled by the device pixel ratio (uDpr); no size attenuation with distance.
const VERT = /* glsl */ `
uniform float uTime;
uniform float uDpr;
attribute vec3 aColor;
attribute vec4 aStar; // x: dot radius (px), y: brightness, z: glow (0..1), w: twinkle amount
attribute float aPhase;
varying vec3 vColor;
varying float vRadius;
varying float vSize;
varying float vGlow;
void main() {
  float twinkle = 1.0 - aStar.w * (0.5 + 0.5 * sin(uTime * (0.6 + fract(aPhase * 7.31) * 1.2) + aPhase * 6.2832));
  vColor = aColor * aStar.y * twinkle;
  vRadius = aStar.x * uDpr;
  vGlow = aStar.z;
  // room for the soft edge, plus the glow for the bright ones
  vSize = (2.0 * aStar.x + 2.0 + aStar.z * 10.0) * uDpr;
  gl_PointSize = vSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAG = /* glsl */ `
uniform float uDpr;
varying vec3 vColor;
varying float vRadius;
varying float vSize;
varying float vGlow;
void main() {
  float d = length(gl_PointCoord - 0.5) * vSize;                          // distance from the centre, device px
  float disc = 1.0 - smoothstep(vRadius - 0.5 * uDpr, vRadius + 0.5 * uDpr, d); // sharp disc, ~1px soft edge
  float glow = vGlow * 0.35 * exp(-d * d / (vSize * vSize * 0.03));
  float a = disc + glow;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}`

function makeStars() {
  const rnd = seeded(42)
  const position = new Float32Array(COUNT * 3)
  const color = new Float32Array(COUNT * 3)
  const star = new Float32Array(COUNT * 4)
  const phase = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    // evenly over the sphere
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u)
    position.set([RADIUS * s * Math.cos(t), RADIUS * u, RADIUS * s * Math.sin(t)], i * 3)

    let pick = rnd(), k = 0
    while (k < TEMPERATURES.length - 1 && pick > TEMPERATURES[k][0]) pick -= TEMPERATURES[k++][0]
    const [, c, warmth] = TEMPERATURES[k]
    color.set(c, i * 3)

    // mostly tiny and faint, some medium, a few bigger; the brightest ~30 get a tiny glow
    const size = rnd()
    const bright = size > 0.992
    const radius = bright ? 1.4 + rnd() * 0.5 : size > 0.93 ? 0.9 + rnd() * 0.4 : 0.55 + rnd() * 0.3
    const brightness = (bright ? 1.25 : size > 0.93 ? 0.55 + rnd() * 0.3 : 0.18 + rnd() * 0.32) * warmth
    const twinkle = rnd() < 0.3 ? 0.12 + rnd() * 0.18 : 0
    star.set([radius, brightness, bright ? 1 : 0, twinkle], i * 4)
    phase[i] = rnd()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3))
  g.setAttribute('aStar', new THREE.BufferAttribute(star, 4))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  return g
}

/** Two extremely faint, large clouds in deep blue and purple, far behind the stars. */
const NEBULAE: [color: string, direction: [number, number, number], size: number, opacity: number][] = [
  ['#1c2f7a', [0.55, 0.3, -0.78], 900, 0.07],
  ['#3d2163', [-0.7, -0.25, -0.65], 800, 0.06],
]

/** Crisp procedural starfield (and two faint nebulae) on a far-away sphere that moves with the camera. */
export function Sky() {
  const geometry = useMemo(() => makeStars(), [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])
  const cloud = useMemo(() => radialTexture([[0, 'rgba(255,255,255,.9)'], [0.4, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), [])
  useEffect(() => () => { geometry.dispose(); material.dispose(); cloud.dispose() }, [geometry, material, cloud])

  const sky = useRef<THREE.Group>(null)
  const points = useRef<THREE.Points>(null)
  useFrame((state) => {
    // centred on the camera, so the stars look infinitely far away (no parallax)
    sky.current?.position.copy(state.camera.position)
    const p = points.current
    if (!p) return
    const u = (p.material as THREE.ShaderMaterial).uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uDpr.value = state.viewport.dpr
  })

  return (
    // drawn first, behind everything else
    <group ref={sky}>
      {NEBULAE.map(([color, [x, y, z], size, opacity], i) => (
        <sprite key={i} position={[x * RADIUS * 0.9, y * RADIUS * 0.9, z * RADIUS * 0.9]} scale={size} renderOrder={-2}>
          <spriteMaterial map={cloud} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} raycast={() => null} />
    </group>
  )
}
