import * as THREE from 'three'

/** A soft round glow drawn on a canvas, used for the star's corona and the nebula clouds. */
export function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(([offset, color]) => g.addColorStop(offset, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}
