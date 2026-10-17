import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { radialTexture } from './textures'

const VERT = `varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`
const FRAG = `uniform float t;varying vec3 vP;varying vec3 vN;varying vec3 vV;
float n3(vec3 p){return sin(p.x*2.1+t)*sin(p.y*2.7-t*1.3)*sin(p.z*2.4+t*.7);}
void main(){vec3 p=vP*1.1;float n=n3(p)*.5+n3(p*2.3+3.0)*.3+n3(p*5.1-1.0)*.2;float f=pow(1.0-max(dot(vN,vV),0.0),2.0);
vec3 a=vec3(1.0,0.45,0.1);vec3 b=vec3(1.0,0.93,0.65);vec3 col=mix(a,b,n*.5+.55)+f*vec3(1.0,0.6,0.25);gl_FragColor=vec4(col,1.0);}`

const CORONA: [number, number][] = [[14, 0.8], [28, 0.3], [56, 0.08]]

/** The user's star: animated surface, glowing corona, and the light that shines on the planets. */
export function Star({ radius = 4 }: { radius?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, vertexShader: VERT, fragmentShader: FRAG }), [])
  const glow = useMemo(() => radialTexture([[0, 'rgba(255,250,235,1)'], [0.15, 'rgba(255,220,150,.85)'], [0.4, 'rgba(255,160,70,.25)'], [1, 'rgba(255,120,40,0)']]), [])
  const body = useRef<THREE.Mesh>(null)
  const sprites = useRef<THREE.Sprite[]>([])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (body.current) (body.current.material as THREE.ShaderMaterial).uniforms.t.value = t * 0.6
    sprites.current.forEach((sp, i) => sp?.scale.setScalar(CORONA[i][0] * (1 + Math.sin(t * 1.3 + i) * 0.04)))
  })

  return (
    <group>
      <pointLight color="#fff0dd" intensity={2.1} distance={0} decay={0} />
      <mesh ref={body} material={mat}>
        <sphereGeometry args={[radius, 64, 48]} />
      </mesh>
      {CORONA.map(([size, opacity], i) => (
        <sprite key={i} ref={(el) => { if (el) sprites.current[i] = el }} scale={size}>
          <spriteMaterial map={glow} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}
