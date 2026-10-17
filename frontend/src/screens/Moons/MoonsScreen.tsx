/**
 * SCREEN 2 · PLANET VIEW (folder: Moons)
 * One algorithm's planet in the centre, with its concepts as moons on orbits.
 *
 * Plug-in point: `planet` will come from GET /api/systems/{id}. Until then the mock blockchain planet is used.
 */
import { Canvas } from '@react-three/fiber'
import { PLANET_POSITION } from './layout'
import { MoonsScene } from './MoonsScene'
import { MOCK_PLANET } from './mockPlanet'
import type { Planet } from './types'

const [px, py, pz] = PLANET_POSITION
const CAMERA_START: [number, number, number] = [px, py + 8, pz + 26]

export interface MoonsScreenProps {
  planet?: Planet
}

export function MoonsScreen({ planet = MOCK_PLANET }: MoonsScreenProps) {
  return (
    <div className="relative h-full overflow-hidden bg-void font-body text-ink">
      {/* same canvas settings as Home; the camera starts in front of and slightly above the planet */}
      <Canvas className="absolute! inset-0" camera={{ fov: 42, near: 0.1, far: 4000, position: CAMERA_START }} dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // if the graphics driver drops the WebGL context, ask the browser to restore it instead of staying black
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}>
        <MoonsScene planet={planet} />
      </Canvas>
    </div>
  )
}
