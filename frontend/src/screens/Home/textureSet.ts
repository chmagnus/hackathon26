/**
 * Where the universe's image textures live (public/textures, WebP, sources in the README's CREDITS) and how they're set up.
 * Narrow screens (under 860px wide) get the 1K versions, everything else 2K; decided once when the app loads.
 */
import * as THREE from 'three'

const SIZE = typeof window !== 'undefined' && window.innerWidth < 860 ? '1k' : '2k'

/** URL of a texture by base name, e.g. textureUrl('mars') -> /textures/mars_2k.webp */
export const textureUrl = (name: string) => `${import.meta.env.BASE_URL}textures/${name}_${SIZE}.webp`

/**
 * Colour images are sRGB, data maps (normal maps, masks) stay linear. Mipmaps stay on (three's default) and anisotropy
 * keeps the maps sharp at grazing angles (three caps it at what the GPU supports).
 */
export function prepareTexture(texture: THREE.Texture, colour: boolean) {
  if (colour) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
}
