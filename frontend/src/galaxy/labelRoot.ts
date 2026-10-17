import { createRef, type RefObject } from 'react'

/**
 * The fixed element 3D labels (drei <Html portal>) are attached to: the Universe wrapper around the canvas.
 * Without a fixed one, drei rebuilds the labels after the first frame and the first label comes out empty.
 */
export const universeLabelRoot = createRef<HTMLDivElement>() as RefObject<HTMLDivElement>
