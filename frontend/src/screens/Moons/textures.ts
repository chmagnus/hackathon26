/**
 * Canvas-drawn textures and colour helpers, ported from the prototype (algoverse2.html).
 */
import * as THREE from 'three'

/**
 * The prototype ran on three r128, which had no colour management: hex colours went to the GPU unchanged.
 * Marking them as already linear stops newer three converting them, so they look the same as before.
 * Only correct together with the canvas's `linear` + `flat` settings (see MoonsScreen).
 */
export function rawColor(css: string) {
  return new THREE.Color().setStyle(css, THREE.LinearSRGBColorSpace)
}

/** Seeded random numbers, so the starfield and craters look the same on every visit. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** A soft round glow drawn on a canvas. */
export function radialTex(stops: [number, string][]) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(([o, s]) => g.addColorStop(o, s))
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** White glow, tinted by the sprite colour (planet and moon halos). */
export const glowTex = () => radialTex([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,.6)'], [0.5, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']])
/** Warm star glow (the far sun). */
export const warmTex = () => radialTex([[0, 'rgba(255,250,235,1)'], [0.15, 'rgba(255,220,150,.85)'], [0.4, 'rgba(255,160,70,.25)'], [1, 'rgba(255,120,40,0)']])

/** Grey cratered moon surface. */
export function craterTex(seed: number) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const x = c.getContext('2d')!
  const r = rng(seed)
  x.fillStyle = '#b9bcc6'
  x.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(${(120 + r() * 80) | 0},${(120 + r() * 80) | 0},${(130 + r() * 80) | 0},.25)`
    x.fillRect(r() * 512, r() * 256, 2 + r() * 5, 2 + r() * 5)
  }
  for (let i = 0; i < 70; i++) {
    const cx = r() * 512, cy = r() * 256, rad = 3 + Math.pow(r(), 2) * 26
    x.fillStyle = 'rgba(70,72,84,.55)'
    x.beginPath()
    x.arc(cx, cy, rad, 0, 7)
    x.fill()
    x.strokeStyle = 'rgba(235,238,245,.45)'
    x.lineWidth = 1.5
    x.beginPath()
    x.arc(cx - rad * 0.12, cy - rad * 0.12, rad, 3.6, 5.6)
    x.stroke()
  }
  return new THREE.CanvasTexture(c)
}
