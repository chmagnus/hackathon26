/**
 * Materials for the photoreal Earth (the Blockchain planet), built on NASA imagery (see the README's CREDITS).
 *  - surface: MeshStandardMaterial with the Blue Marble day map and a normal map, plus (via onBeforeCompile)
 *    ocean-mask roughness, cloud shadows, Black Marble city lights on the night side, a tight ocean glint and limb haze
 *  - clouds: a slightly larger transparent sphere, thinner on the night side so the city lights show through
 *  - atmosphere: a thin back-side shell, blue on the lit limb, an orange band at the terminator, nothing at night
 * The ground and clouds are lit by the star plus part of the scene's cool fill (EARTH_FILL), so the night side is a
 * dark blue-grey and the city lights stand out; a subtle rim keeps the night-side silhouette visible.
 */
import * as THREE from 'three'
import { atmosphereMaterial, type AtmosphereLook } from './atmosphere'
import { EARTH_FILL, RIM_COLOR, rimGlsl, STAR_POSITION as STAR } from './lighting'

/** Blue on the lit limb, an orange band at the terminator. */
const EARTH_ATMOSPHERE: AtmosphereLook = { day: [0.30, 0.58, 1.0], dusk: [0.8, 0.36, 0.128], strength: 1.15, scale: 1.045 }
export const ATMOSPHERE_SCALE = EARTH_ATMOSPHERE.scale
/** Radius of the cloud layer, as a multiple of the planet's. */
export const CLOUD_SCALE = 1.01

/** Scales the scene's fill (ambient + hemisphere) down to EARTH_FILL for a built-in material. */
const PART_FILL = /* glsl */ `#include <lights_fragment_begin>
#if defined( RE_IndirectDiffuse )
  irradiance *= ${EARTH_FILL.toFixed(2)};
#endif`
/** The rim colour as a GLSL vec3, toned down like the fill. */
const EARTH_RIM = `vec3(${RIM_COLOR.toArray().map((c) => (c * EARTH_FILL).toFixed(3)).join(', ')})`

/** Varyings shared by the surface and the clouds: the sphere normal and the direction to the star, in object space. */
const STAR_VERT_PARS = /* glsl */ `
uniform vec3 uStar;
varying vec3 vObjN;
varying vec3 vObjL;
varying vec3 vViewL;`
const STAR_VERT = /* glsl */ `
vObjN = normalize(position);
// transpose of the rotation takes world directions into the sphere's own (turning) frame
vObjL = transpose(mat3(modelMatrix)) * (uStar - (modelMatrix * vec4(position, 1.0)).xyz);
vViewL = (viewMatrix * vec4(uStar, 1.0)).xyz - mvPosition.xyz;`
const STAR_FRAG_PARS = /* glsl */ `
varying vec3 vObjN;
varying vec3 vObjL;
varying vec3 vViewL;`

function addStarVaryings(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uStar = { value: STAR }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${STAR_VERT_PARS}`)
    .replace('#include <project_vertex>', `#include <project_vertex>\n${STAR_VERT}`)
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${STAR_FRAG_PARS}`)
    .replace('#include <lights_fragment_begin>', PART_FILL)
}

const SURFACE_FRAG_PARS = /* glsl */ `
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform sampler2D uOcean;
uniform float uCloudShift;`

// after map_fragment: everything the later steps need, and the cloud shadows on the ground
const SURFACE_FRAG_SETUP = /* glsl */ `
vec3 eN = normalize(vObjN);
vec3 eL = normalize(vObjL);
float eSun = dot(eN, eL);                                   // 1 at noon, 0 on the terminator, below 0 at night
float eOcean = texture2D(uOcean, vMapUv).r;                 // 1 = water
vec2 eCloudUv = vMapUv + vec2(uCloudShift, 0.0);            // the cloud layer turns a little faster than the ground
float eCloud = texture2D(uClouds, eCloudUv).a;
// cloud shadows: the cloud between this point and the star sits a little towards the star along the surface
vec3 eEast = normalize(vec3(eN.z, 0.0, -eN.x) + vec3(1e-5, 0.0, 0.0));
vec3 eNorth = cross(eN, eEast);
vec3 eToStar = (eL - eN * eSun) * (0.015 / max(eSun, 0.25)); // along the ground, longer when the star is low
vec2 eShadowUv = eCloudUv + vec2(dot(eToStar, eEast) / (6.2832 * max(length(eN.xz), 0.1)), dot(eToStar, eNorth) / 3.1416);
diffuseColor.rgb *= 1.0 - 0.5 * texture2D(uClouds, eShadowUv).a;`

// oceans glossy, land matte
const SURFACE_ROUGHNESS = /* glsl */ `
float roughnessFactor = mix(0.95, 0.42, eOcean);`

// city lights fade in across the terminator, only on the side facing away from the star
const SURFACE_NIGHT = /* glsl */ `
totalEmissiveRadiance += texture2D(uNight, vMapUv).rgb * (1.0 - smoothstep(-0.22, 0.04, eSun)) * 2.4;`

// before opaque_fragment: tight sun glint on open water, the atmosphere's haze over the planet's edge, and the rim
const SURFACE_GLINT = /* glsl */ `
#if NUM_POINT_LIGHTS > 0
  vec3 eStarColor = pointLights[0].color;
#else
  vec3 eStarColor = vec3(0.0);
#endif
vec3 eV = normalize(vViewPosition);
vec3 eLv = normalize(vViewL);
float eGlint = pow(max(dot(normal, normalize(eLv + eV)), 0.0), 700.0) * smoothstep(0.0, 0.1, dot(normal, eLv));
outgoingLight += eStarColor * eGlint * 1.6 * eOcean * (1.0 - eCloud);
float eRim = pow(1.0 - saturate(dot(nonPerturbedNormal, eV)), 3.0);
vec3 eSky = mix(vec3(1.0, 0.45, 0.18), vec3(0.32, 0.6, 1.0), smoothstep(-0.05, 0.35, eSun));
outgoingLight += eSky * eRim * smoothstep(-0.2, 0.3, eSun) * 0.55;
${rimGlsl(EARTH_RIM)}`

export interface EarthTextures {
  day: THREE.Texture
  night: THREE.Texture
  clouds: THREE.Texture
  normal: THREE.Texture
  ocean: THREE.Texture
}

/** The ground. userData.cloudShift is how far the clouds have turned past the ground, in texture widths (set each frame). */
export function earthSurfaceMaterial(t: EarthTextures) {
  const cloudShift = { value: 0 }
  const material = new THREE.MeshStandardMaterial({ map: t.day, normalMap: t.normal, normalScale: new THREE.Vector2(0.9, 0.9), metalness: 0 })
  material.userData.cloudShift = cloudShift
  material.onBeforeCompile = (shader) => {
    addStarVaryings(shader)
    Object.assign(shader.uniforms, { uNight: { value: t.night }, uClouds: { value: t.clouds }, uOcean: { value: t.ocean }, uCloudShift: cloudShift })
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SURFACE_FRAG_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${SURFACE_FRAG_SETUP}`)
      .replace('#include <roughnessmap_fragment>', SURFACE_ROUGHNESS)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SURFACE_NIGHT}`)
      .replace('#include <opaque_fragment>', `${SURFACE_GLINT}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'nova-earth-surface'
  return material
}

/** The cloud layer: white, with the cloud map's alpha. Thinner at night so it doesn't black out the city lights. */
export function earthCloudMaterial(clouds: THREE.Texture) {
  const material = new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    addStarVaryings(shader)
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.a *= mix(0.45, 1.0, smoothstep(-0.25, 0.1, dot(normalize(vObjN), normalize(vObjL))));`)
  }
  material.customProgramCacheKey = () => 'nova-earth-clouds'
  return material
}

/** The atmosphere shell (radius ATMOSPHERE_SCALE times the planet's). */
export const earthAtmosphereMaterial = () => atmosphereMaterial(EARTH_ATMOSPHERE)
