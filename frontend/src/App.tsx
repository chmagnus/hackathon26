import { useState } from 'react'
import { Universe } from './galaxy/Universe'
import { HomeScreen } from './screens/Home/HomeScreen'
import { MoonsScreen } from './screens/Moons/MoonsScreen'
import ConceptScreen from './screens/Concept/ConceptScreen'

// One shared 3D Universe with each screen's 2D overlay on top. Which planet/chapter the camera is on lives in
// src/galaxy/view.ts (maps to routes later: '/', '/:planetId', '/:planetId/:moonId').
export default function App() {
  const [openMoon, setOpenMoon] = useState<string | null>(null)

  return (
    <div className="relative h-full overflow-hidden">
      <Universe />
      <HomeScreen />
      <MoonsScreen onSelectMoon={setOpenMoon} />
      {openMoon && (
        <div className="absolute inset-0 z-50">
          <ConceptScreen
            moonId={openMoon}
            onBack={() => setOpenMoon(null)}
            onComplete={() => setOpenMoon(null)}
            onOpenMoon={setOpenMoon}
          />
        </div>
      )}
    </div>
  )
}