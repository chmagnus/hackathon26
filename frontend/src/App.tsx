import { Universe } from './galaxy/Universe'
import { HomeScreen } from './screens/Home/HomeScreen'
import { MoonsScreen } from './screens/Moons/MoonsScreen'

// One shared 3D Universe with each screen's 2D overlay on top. Which planet/chapter the camera is on lives in
// src/galaxy/view.ts (maps to routes later: '/', '/:planetId', '/:planetId/:moonId').
export default function App() {
  return (
    <div className="relative h-full overflow-hidden">
      <Universe />
      <HomeScreen />
      <MoonsScreen />
    </div>
  )
}
