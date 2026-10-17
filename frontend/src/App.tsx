import { Universe } from './galaxy/Universe'
import { HomeScreen } from './screens/Home/HomeScreen'
import { MoonsScreen } from './screens/Moons/MoonsScreen'
import ConceptScreen from './screens/Concept/ConceptScreen'

// One shared 3D Universe with each screen's 2D overlay on top. Which planet/chapter the camera is on lives in
// src/galaxy/view.ts (maps to routes later: '/', '/:planetId', '/:planetId/:moonId').
// The Concept page opens from the Moon screen's chapter panel, which also runs the transition in and out of it.
export default function App() {
  return (
    <div className="relative h-full overflow-hidden">
      <Universe />
      <HomeScreen />
      <MoonsScreen renderConcept={(moonId, handlers) => <ConceptScreen moonId={moonId} {...handlers} />} />
    </div>
  )
}
