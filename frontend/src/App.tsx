import { useState } from 'react'
import { HomeScreen } from './screens/Home/HomeScreen'
import type { PlanetId } from './screens/Home/planets'
import { MoonsScreen } from './screens/Moons/MoonsScreen'

// Which screen is showing. Kept as plain state for now; maps to routes later ('/' and '/:planetId').
type Screen = { name: 'home' } | { name: 'moons'; planetId: PlanetId }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  if (screen.name === 'moons') {
    // MoonsScreen only has the blockchain mock data so far; planetId will choose the planet once content comes from the API
    return <MoonsScreen onBack={() => setScreen({ name: 'home' })} />
  }
  return <HomeScreen onSelectPlanet={(planetId) => setScreen({ name: 'moons', planetId })} />
}
