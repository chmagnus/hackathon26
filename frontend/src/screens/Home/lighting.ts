/**
 * Art-directed lighting shared by everything in the Universe:
 *  - STAR_LIGHT: the star's point light (Star.tsx), with no distance falloff so every planet gets similar light
 *  - FILL: a soft, cool hemisphere fill so night sides are dark blue-grey, never pure black
 *  - RIM: a subtle fresnel rim so planet and moon silhouettes always read against space
 * Built-in materials get the fill from <FillLight /> (FillLight.tsx). Custom shaders that don't use scene lights
 * (the ring) get the same values as uniforms (fillUniforms, starLightColor).
 */
import * as THREE from 'three'

/** The star sits at the world origin. */
export const STAR_POSITION = new THREE.Vector3(0, 0, 0)
export const STAR_LIGHT = { color: '#fff0dd', intensity: 2.1 }
/** What the star's point light delivers (linear colour × intensity), for custom shaders. */
export const starLightColor = () => new THREE.Color(STAR_LIGHT.color).multiplyScalar(STAR_LIGHT.intensity)

export const FILL = { sky: '#8fa6d8', ground: '#262d45', intensity: 0.42 }
/** The photoreal Earth takes only part of the fill, so its city lights stay the brightest thing on the night side. */
export const EARTH_FILL = 0.5

/** Cool rim colour (linear) and falloff: higher power = thinner rim. */
export const RIM_COLOR = new THREE.Color(0.1, 0.14, 0.22)
export const RIM_POWER = 3.5

/**
 * The fill as custom shaders need it: what a hemisphere light gives a Lambert surface (colour × intensity / π),
 * for a normal pointing straight up (sky) or down (ground).
 */
export function fillUniforms() {
  const k = FILL.intensity / Math.PI
  return {
    uFillSky: { value: new THREE.Color(FILL.sky).multiplyScalar(k) },
    uFillGround: { value: new THREE.Color(FILL.ground).multiplyScalar(k) },
  }
}

/**
 * GLSL for built-in materials, inserted before opaque_fragment: adds a fresnel rim of the given colour
 * (a vec3 expression) around the silhouette.
 */
export const rimGlsl = (color: string) => /* glsl */ `
outgoingLight += (${color}) * pow(1.0 - saturate(dot(nonPerturbedNormal, normalize(vViewPosition))), ${RIM_POWER.toFixed(2)});`
