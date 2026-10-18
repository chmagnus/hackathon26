// Sound effects + background music for nova.
// Put the files in frontend/public/sounds/ with these names:
//   whoosh.mp3        - clicking a planet
//   algo-click.mp3    - clicking Algo
//   algo.m4a          - Algo's voice while the AI is responding (loops)
//   moon-whoosh.mp3   - clicking a chapter moon
//   soundtrack.m4a    - background soundtrack (loops on every page)
//
// While any sound effect or Algo's voice plays, the music fades down ("ducks") and fades back up after.
// The volume slider (MusicToggle) sets a master volume that scales every sound.
//
// Usage:
//   import { playPlanetClick, playAlgoClick, playMoonClick } from '../../shared/sounds'
//   <button onClick={() => { playPlanetClick(); /* your existing code */ }}>

const files = {
  planet: '/sounds/whoosh.mp3',
  algoClick: '/sounds/algo-click.mp3',
  algo: '/sounds/algo.m4a',
  moon: '/sounds/moon-whoosh.mp3',
}

// Volume for each sound, from 0 (silent) to 1 (full). Adjust to taste.
const volumes = {
  planet: 0.5,
  algoClick: 0.6,
  algo: 0.6,
  moon: 0.5,
}

const MUSIC_FILE = '/sounds/soundtrack.m4a'
const MUSIC_VOLUME = 0.25 // normal music volume
const DUCKED = 0.3 // while other sounds play, the music drops to 30% of its normal volume
const FADE_DOWN_MS = 150
const FADE_UP_MS = 700

type SoundName = keyof typeof files

let muted = (() => {
  try { return localStorage.getItem('nova-muted') === 'true' } catch { return false }
})()

// Master volume from the volume slider, 0 (silent) to 1 (full). Scales every sound. Remembered between visits.
let master = (() => {
  try {
    const saved = Number(localStorage.getItem('nova-volume'))
    return localStorage.getItem('nova-volume') !== null && saved >= 0 && saved <= 1 ? saved : 1
  } catch { return 1 }
})()

/* ---------- Background music + ducking ---------- */

let music: HTMLAudioElement | null = null
let duckCount = 0 // how many sounds are playing right now
let fadeFrame = 0

/** Smoothly changes the music volume to `target` over `ms` milliseconds. */
function fadeMusicTo(target: number, ms: number) {
  if (!music) return
  cancelAnimationFrame(fadeFrame)
  const from = music.volume
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    music!.volume = from + (target - from) * t
    if (t < 1) fadeFrame = requestAnimationFrame(step)
  }
  fadeFrame = requestAnimationFrame(step)
}

const musicLevel = () => (duckCount > 0 ? MUSIC_VOLUME * DUCKED : MUSIC_VOLUME) * master

function duck() {
  duckCount++
  fadeMusicTo(musicLevel(), FADE_DOWN_MS)
}

function unduck() {
  duckCount = Math.max(0, duckCount - 1)
  if (duckCount === 0) fadeMusicTo(musicLevel(), FADE_UP_MS)
}

export function startMusic() {
  if (muted) return
  if (!music) {
    music = new Audio(MUSIC_FILE)
    music.loop = true
    music.volume = musicLevel()
  }
  music.play().catch(() => {
    // Blocked until the user interacts with the page; startMusicOnFirstClick handles that.
  })
}

/** Call once when the app loads: the music starts the first time the user clicks or presses a key. */
export function startMusicOnFirstClick() {
  const start = () => {
    startMusic()
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('keydown', start)
  }
  window.addEventListener('pointerdown', start)
  window.addEventListener('keydown', start)
}

/* ---------- Sound effects ---------- */

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
  sound.volume = volumes[name] * master
  duck()
  sound.addEventListener('ended', unduck, { once: true })
  sound.play().catch(() => {
    // Browsers sometimes block sound until the user has clicked the page. Skip it and restore the music.
    unduck()
  })
}

export const playPlanetClick = () => play('planet')
export const playAlgoClick = () => play('algoClick')
export const playMoonClick = () => play('moon')

/* ---------- Algo's voice: loops while the AI is responding, stops when it's done ---------- */

let voice: HTMLAudioElement | null = null
let voiceDucking = false

export function startAlgoVoice() {
  if (muted) return
  if (!voice) {
    voice = new Audio(files.algo)
    voice.loop = true
  }
  voice.volume = volumes.algo * master
  voice.currentTime = 0
  if (!voiceDucking) { voiceDucking = true; duck() }
  voice.play().catch(() => {
    // Browsers sometimes block sound until the user has clicked the page.
  })
}

export function stopAlgoVoice() {
  if (voiceDucking) { voiceDucking = false; unduck() }
  if (!voice) return
  voice.pause()
  voice.currentTime = 0
}

/* ---------- Mute ---------- */

// Turn all sounds on or off (handy for a mute button). Remembered between visits.
export function setMuted(value: boolean) {
  muted = value
  try { localStorage.setItem('nova-muted', String(value)) } catch { /* storage blocked */ }
  if (muted) {
    stopAlgoVoice()
    music?.pause()
  } else {
    startMusic()
  }
}

export function isMuted() {
  return muted
}

/* ---------- Volume ---------- */

/** Sets the master volume (0 to 1) for everything: music, sound effects and Algo's voice. */
export function setVolume(value: number) {
  master = Math.min(1, Math.max(0, value))
  try { localStorage.setItem('nova-volume', String(master)) } catch { /* storage blocked */ }
  fadeMusicTo(musicLevel(), 80)
  if (voice) voice.volume = volumes.algo * master
}

export function getVolume() {
  return master
}