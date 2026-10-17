import { HomeScreen } from './screens/Home/HomeScreen'

// Screen 1 (Home) on its own for now. When screen 2 (Moons) exists, switch screens here,
// e.g. <HomeScreen onSelectPlanet={(id) => setScreen({ name: 'moons', planetId: id })} />
export default function App() {
  return <HomeScreen />
}
