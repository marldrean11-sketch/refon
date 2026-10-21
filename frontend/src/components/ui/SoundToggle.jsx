import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isSoundOn, onSoundChange, setSoundOn } from '../../lib/sound.js'

/** The footer speaker switch for the interface sounds. On until muted. */
export function SoundToggle({ className = '' }) {
  const [on, setOn] = useState(isSoundOn)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(isSoundOn()))
    const off = onSoundChange(setOn)
    return () => {
      cancelAnimationFrame(id)
      off()
    }
  }, [])

  const Icon = on ? Volume2 : VolumeX

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-testid="sound-toggle"
      onClick={() => setSoundOn(!on)}
      className={`rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        on ? 'border-accent bg-accent-100 text-accent' : 'border-line-2 text-muted hover:text-ink'
      } ${className}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      Sounds {on ? 'on' : 'off'}
    </button>
  )
}
