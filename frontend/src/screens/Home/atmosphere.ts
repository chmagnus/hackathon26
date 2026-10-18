/**
 * A thin atmosphere shell around a planet, drawn additively from the inside (back faces): the day colour on the lit
 * limb, a thin dusk band at the terminator, nothing on the night side, a little brighter when the star is behind.
 */
import * as THREE from 'three'
import { STAR_POSITION } from './lighting'

export interface AtmosphereLook {
  /** colour on the lit limb (linear) */
  day: [number, number, number]
  /** colour of the band along the terminator (linear, already scaled) */
  dusk: [number, number, number]
  strength: number
  /** shell radius as a multiple of the planet's */
  scale: number
}

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec3 vC;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const FRAG = /* glsl */ `
uniform vec3 uStar;
uniform float uInner; // planet radius / shell radius
uniform vec3 uDay;
uniform vec3 uDusk;
uniform float uStrength;
varying vec3 vN;
varying vec3 vW;
varying vec3 vC;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uStar - vC);
  // Only the shell's far side is drawn, and the planet hides the part behind it, so what's left is a ring around the
  // planet. t runs from 0 at the ring's outer edge to 1 where the view ray grazes the planet (densest air).
  float t = clamp(-dot(N, V) / sqrt(1.0 - uInner * uInner), 0.0, 1.0);
  float density = pow(t, 2.6);
  // sun angle at the point of the limb this pixel looks through
  float s = dot(normalize(N - V * dot(N, V)), L);
  vec3 day = uDay * smoothstep(-0.12, 0.4, s);                     // scattered daylight on the lit limb
  vec3 dusk = uDusk * exp(-pow(s / 0.16, 2.0));                    // thin reddened band at the terminator
  float night = smoothstep(-0.35, -0.05, s);                       // fades to nothing on the night side
  float forward = 1.0 + 1.2 * pow(max(dot(-V, L), 0.0), 6.0);      // brighter when the star is behind the planet
  gl_FragColor = vec4((day + dusk) * night * density * forward * uStrength, 1.0);
}`

export function atmosphereMaterial(look: AtmosphereLook) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uStar: { value: STAR_POSITION },
      uInner: { value: 1 / look.scale },
      uDay: { value: new THREE.Vector3(...look.day) },
      uDusk: { value: new THREE.Vector3(...look.dusk) },
      uStrength: { value: look.strength },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
