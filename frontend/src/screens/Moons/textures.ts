/**
 * Canvas-drawn textures for the moon system: the halo glow, reusing Home's radialTexture.
 * (The moon surfaces are NASA's CGI Moon Kit, loaded in MoonSystem.)
 */
import { radialTexture } from '../Home/textures'

/** White glow, tinted by the sprite colour (moon halos). */
export const glowTex = () => radialTexture([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,.6)'], [0.5, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']])
