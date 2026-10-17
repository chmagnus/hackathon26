/**
 * SCREEN 2 · PLANET VIEW (folder: Moons)
 * One algorithm's planet in the centre, with one moon per chapter (orbit) circling it.
 *
 * Plug-in points:
 *  - planet: will come from GET /api/systems/{id}. Until then the mock blockchain planet is used.
 *  - progress: will come from the shared progress store. Until then mock progress is used.
 *  - onBack: go back to the Universe (Home) screen.
 */
import { Canvas } from '@react-three/fiber'
import { chapterState, type ChapterProgress } from './chapters'
import { CAMERA_DISTANCE, CAMERA_ELEVATION } from './layout'
import { MoonsHud } from './MoonsHud'
import { MoonsScene } from './MoonsScene'
import { MOCK_PLANET } from './mockPlanet'
import { MOCK_PROGRESS } from './mockProgress'
import type { Planet } from './types'

const CAMERA_START: [number, number, number] = [0, Math.sin(CAMERA_ELEVATION) * CAMERA_DISTANCE, Math.cos(CAMERA_ELEVATION) * CAMERA_DISTANCE]

export interface MoonsScreenProps {
  planet?: Planet
  progress?: ChapterProgress
  onBack?: () => void
}

export function MoonsScreen({ planet = MOCK_PLANET, progress = MOCK_PROGRESS, onBack }: MoonsScreenProps) {
  const states = planet.orbits.map((orbit) => chapterState(orbit, planet.orbits, progress))

  return (
    <div className="relative h-full overflow-hidden bg-void font-body text-ink">
      {/* `linear` + `flat`: no output colour conversion and no tone mapping, like the three r128 prototype.
          Only affects this canvas; colours inside are made with rawColor() to match. */}
      <Canvas className="absolute! inset-0" linear flat camera={{ fov: 42, near: 0.1, far: 4000, position: CAMERA_START }} dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          // if the graphics driver drops the WebGL context, ask the browser to restore it instead of staying black
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}>
        <MoonsScene planet={planet} states={states} />
      </Canvas>
      <MoonsHud planet={planet} states={states} onBack={onBack} />
    </div>
  )
}
