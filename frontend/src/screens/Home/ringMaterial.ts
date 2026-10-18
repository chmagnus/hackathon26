/**
 * Saturn-style ring (texture with alpha: gaps and density bands), mapped from the inner edge (u = 0) to the outer edge
 * (u = 1). Lit by the star like the planets (plus the shared fill), slightly see-through, and the planet's shadow falls
 * across it: fragments inside the cylinder behind the planet, pointing away from the star, are darkened.
 */
import * as THREE from 'three'
import { fillUniforms, STAR_POSITION, starLightColor } from './lighting'

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; // the ring's centre is the planet's
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uStar;
uniform vec3 uStarColor;
uniform vec3 uFillSky;
uniform vec3 uFillGround;
uniform float uPlanetRadius;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
void main() {
  vec4 tex = texture2D(uMap, vec2(vUv.x, 0.5));
  vec3 N = normalize(vN);
  vec3 L = normalize(uStar - vW);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, L);
  // the lit face takes the light head on; from the other face you see the light scattered through, more where it's thin
  float face = ndl * dot(N, V) > 0.0 ? 1.0 : 0.45 + 0.4 * (1.0 - tex.a);
  // the planet's shadow: a cylinder of the planet's radius, from the planet away from the star, with a soft edge
  vec3 away = normalize(vC - uStar);
  vec3 d = vW - vC;
  float along = dot(d, away);
  float shadow = step(0.0, along) * (1.0 - smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.04, length(d - away * along)));
  vec3 direct = uStarColor * 0.3183 * abs(ndl) * face * (1.0 - 0.92 * shadow); // Lambert, as for the planets
  vec3 fill = (uFillSky + uFillGround) * 0.5;                                // a flat ring sees sky and ground alike
  gl_FragColor = vec4(tex.rgb * (direct + fill), tex.a * uOpacity);
}`

export function ringMaterial(map: THREE.Texture, planetRadius: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uMap: { value: map },
      uStar: { value: STAR_POSITION },
      uStarColor: { value: starLightColor() },
      uPlanetRadius: { value: planetRadius },
      uOpacity: { value: 0.9 },
      ...fillUniforms(),
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
