/**
 * THE UNIVERSE: the one shared WebGL canvas.
 * Holds what every screen shares (background, ambient light, starfield, the user's star, the camera rig,
 * bloom + tone mapping and the 3D label container). Screens add their own 3D with <InUniverse> and draw
 * their 2D overlays on top. The camera is driven by useView() (src/galaxy/view.ts).
 */
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Sky } from '../screens/Home/Sky'
import { Star } from '../screens/Home/Star'
import { CameraRig } from './CameraRig'
import { universeLabelRoot } from './labelRoot'
import { UniverseContents } from './tunnel'

export function Universe() {
  return (
    <div ref={universeLabelRoot} className="absolute inset-0 overflow-hidden bg-void">
      <Canvas className="absolute! inset-0" camera={{ fov: 42, near: 0.1, far: 4000, position: [0, 50, 110] }} dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // if the graphics driver drops the WebGL context, ask the browser to restore it instead of staying black
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}>
        <color attach="background" args={['#03040a']} />
        {/* low ambient light keeps each planet's night side properly dark */}
        <ambientLight color="#404a70" intensity={0.15} />
        <Sky />
        <Star />
        <CameraRig />

        <UniverseContents />

        {/* glow: makes the star and the bright atmosphere rims bleed light like a camera lens */}
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.6} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
          {/* tone mapping has to happen here: the renderer's own setting is skipped when effects are on */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
