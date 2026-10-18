/**
 * Shaders for the star at the centre.
 *  - surface: golden yellow in the middle deepening to rich orange at the edge, with clearly visible, slowly churning
 *    plasma (brighter swirls, slightly darker cells) and a soft warm fresnel rim. Kept mostly below the bloom
 *    threshold (0.8 luminance) so tone mapping and bloom don't wash it out; only the brightest specks cross it.
 *  - glow: camera-facing layers with smooth radial gradients only (no streaks), additive, reaching zero exactly at
 *    uExtent so no edge ever shows.
 */
import { NOISE_GLSL } from './noise'

export const SUN_VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
void main() {
  vObj = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

export const SUN_FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
${NOISE_GLSL}
void main() {
  vec3 p = normalize(vObj);
  float mu = clamp(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0, 1.0); // 1 at the centre, 0 at the edge
  float t = uTime;
  // slow large-scale flow that warps everything, so the plasma churns rather than scrolls
  vec3 warp = vec3(snoise(p * 1.8 + t * 0.025), snoise(p * 1.8 + 7.0 - t * 0.02), snoise(p * 1.8 + 13.0 + t * 0.018));
  float swirls = smoothstep(0.25, 0.75, fbm(p * 3.2 + warp * 0.8 + vec3(t * 0.012, 0.0, -t * 0.01)) * 0.5 + 0.5); // big bright swirls
  float ridges = 1.0 - abs(snoise(p * 11.0 + warp * 1.2 + vec3(0.0, t * 0.04, 0.0)));         // bright lanes between cells
  float cells = snoise(p * 26.0 + warp * 1.5 - t * 0.03) * 0.5 + 0.5;                         // fine granules
  float plasma = 0.58 + 0.42 * swirls + 0.2 * ridges * ridges + 0.1 * cells;                 // ~0.6 .. 1.3
  // golden yellow in the middle, rich orange towards the edge
  vec3 gold = vec3(1.0, 0.54, 0.08);
  vec3 orange = vec3(0.95, 0.3, 0.035);
  vec3 colour = mix(orange, gold, smoothstep(0.05, 0.85, mu)) * plasma;
  // soft bright warm rim: the silhouette reads crisply without an outline
  colour += vec3(1.0, 0.5, 0.12) * pow(1.0 - mu, 2.5) * 0.45;
  gl_FragColor = vec4(colour, 1.0);
}`

export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const GLOW_FRAG = /* glsl */ `
uniform float uExtent;    // how far the glow reaches, in star radii (it is exactly 0 there)
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0) * uExtent;                    // distance from the centre, in star radii
  float x = clamp((r - 1.0) / (uExtent - 1.0), 0.0, 1.0);         // 0 on the disc's edge, 1 where the glow ends
  float glow = pow(1.0 - x, 3.0) * (1.0 - x * x);                 // smooth, steepest near the disc, flat to zero
  gl_FragColor = vec4(uColor * glow * uIntensity, 1.0);
}`
