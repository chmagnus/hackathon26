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

/** Saturn-style ring: thin bands of varying brightness and gaps, tinted with the planet colour. */
export function ringTexture(tint: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 4
  const ctx = c.getContext('2d')!
  const base = new THREE.Color(tint).lerp(new THREE.Color('#e9e2d0'), 0.5)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  for (let x = 0; x < 512; x++) {
    const t = x / 511
    const edge = Math.min(1, t * 8, (1 - t) * 6) // fade in at the inner edge, out at the outer
    const gap = t > 0.62 && t < 0.67 ? 0.08 : 1 // a dark gap, like Saturn's Cassini division
    const band = 0.45 + 0.55 * rnd()
    const a = Math.max(0, edge) * gap * band * 0.85
    const k = 0.7 + 0.3 * band
    ctx.fillStyle = `rgba(${(base.r * 255 * k) | 0},${(base.g * 255 * k) | 0},${(base.b * 255 * k) | 0},${a.toFixed(3)})`
    ctx.fillRect(x, 0, 1, 4)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
