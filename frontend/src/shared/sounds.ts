// Sound effects for nova, using audio files you choose.
// Put your files in frontend/public/sounds/ with these names:
//   planet.mp3        - clicking a planet
//   algo-click.mp3    - clicking Algo
//   algo.mp3          - Algo's voice while the AI is responding (loops)
//   travel.mp3        - moving between planets
//
// Usage:
//   import { playPlanetClick, playAlgoClick, playTravel } from '../../shared/sounds'
//   <button onClick={() => { playPlanetClick(); /* your existing code */ }}>
 
const files = {
  planet: '/sounds/planet.mp3',
  algoClick: '/sounds/algo-click.mp3',
  algo: '/sounds/algo.m4a',
  travel: '/sounds/travel.mp3',
}
 
// Volume for each sound, from 0 (silent) to 1 (full). Adjust to taste.
const volumes = {
  planet: 0.5,
  algoClick: 0.6,
  algo: 0.6,
  travel: 0.5,
}
 
type SoundName = keyof typeof files
 
let muted = false
const loaded: Partial<Record<SoundName, HTMLAudioElement>> = {}
 
function play(name: SoundName) {
  if (muted) return
 
  // Load each file once, the first time it's needed.
  let original = loaded[name]
  if (!original) {
    original = new Audio(files[name])
    original.preload = 'auto'
    loaded[name] = original
  }
 
  // Play a copy, so fast repeated clicks can overlap instead of cutting off.
  const sound = original.cloneNode() as HTMLAudioElement
  sound.volume = volumes[name]
  sound.play().catch(() => {
    // Browsers sometimes block sound until the user has clicked the page.
    // Ignoring the error just means that one sound is skipped.
  })
}
 
export const playPlanetClick = () => play('planet')
export const playAlgoClick = () => play('algoClick')
export const playTravel = () => play('travel')
 
// Algo's voice: loops while the AI is responding, stops when it's done.
let voice: HTMLAudioElement | null = null
 
export function startAlgoVoice() {
  if (muted) return
  if (!voice) {
    voice = new Audio(files.algo)
    voice.loop = true
  }
  voice.volume = volumes.algo
  voice.currentTime = 0
  voice.play().catch(() => {
    // Browsers sometimes block sound until the user has clicked the page.
  })
}
 
export function stopAlgoVoice() {
  if (!voice) return
  voice.pause()
  voice.currentTime = 0
}
 
// Turn all sounds on or off (handy for a mute button).
export function setMuted(value: boolean) {
  muted = value
  if (muted) stopAlgoVoice()
}
 
export function isMuted() {
  return muted
}
