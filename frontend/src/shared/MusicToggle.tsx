import { useEffect, useState } from 'react'
import { getVolume, isMuted, setMuted, setVolume, startMusicOnFirstClick } from './sounds'

/**
 * Sound controls in the bottom-left corner: a mute button and a volume slider.
 * Also starts the soundtrack on the first click (browsers block music before that).
 */
export default function MusicToggle() {
  const [muted, setMutedState] = useState(isMuted)
  const [volume, setVolumeState] = useState(getVolume)

  useEffect(() => startMusicOnFirstClick(), [])

  function toggleMute() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  function changeVolume(value: number) {
    setVolume(value)
    setVolumeState(value)
    // Dragging the slider up while muted turns sound back on
    if (muted && value > 0) {
      setMuted(false)
      setMutedState(false)
    }
  }

  const silent = muted || volume === 0
  const icon = silent ? '🔇' : volume < 0.5 ? '🔉' : '🔊'

  return (
    <div className="fixed bottom-5 left-5 z-[60] flex items-center gap-2 rounded-full border border-white/15 bg-[#0b1427]/90 py-1.5 pr-4 pl-1.5 backdrop-blur">
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        title={muted ? 'Turn sound on' : 'Turn sound off'}
        className="grid h-8 w-8 place-items-center rounded-full text-lg cursor-pointer hover:bg-white/10"
      >
        {icon}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={silent ? 0 : Math.round(volume * 100)}
        onChange={(e) => changeVolume(Number(e.target.value) / 100)}
        aria-label="Volume"
        className="w-24 cursor-pointer accent-mint"
      />
    </div>
  )
}
