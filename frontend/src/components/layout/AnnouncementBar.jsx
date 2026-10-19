import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { useSiteSettings } from '../../lib/site-settings.js'
import { Container } from '../../features/design/Container.jsx'

const DISMISSED_KEY = 'refon:announcement-dismissed'

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY)
  } catch {
    return null
  }
}

/**
 * The booth announcement an admin sets on fair day ("Visit us at Booth #12…").
 * It stays still, unlike the ticker, so it can be read at a glance. Closing it
 * hides that message for the rest of the visit; a new message shows again.
 */
function BoothAnnouncement() {
  const { announcement } = useSiteSettings()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!announcement || dismissed === announcement) return null

  function dismiss() {
    setDismissed(announcement)
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, announcement)
    } catch {
      // Private mode: it stays hidden until the next page load.
    }
  }

  return (
    <div
      data-testid="booth-announcement"
      role="region"
      aria-label="Announcement"
      className="border-b border-line bg-card text-ink"
    >
      <Container className="flex items-center gap-3 py-2.5">
        <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{announcement}</p>
        <button
          type="button"
          onClick={dismiss}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-well hover:text-ink"
          aria-label="Close announcement"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </Container>
    </div>
  )
}

/**
 * The ticker above the header.
 *
 * A lime strip of Taglish lines and brand names that scrolls sideways forever.
 * The list is rendered twice and the track slides by exactly half its width,
 * which is what makes the loop seamless. The second copy is `aria-hidden` so a
 * screen reader hears each line once, and reduced motion stops the track
 * (`index.css`), leaving the first few lines readable in place.
 */
const LINES = Object.freeze([
  'Sulit na, legit pa',
  'iPhone',
  'Check mo muna',
  'Samsung',
  'Walang tinatago',
  'Pixel',
  'Battery measured, hindi hula',
  'Xiaomi',
  'Nasa Techno Fair ka? Scan the QR at the booth',
  'OPPO',
  '7-day returns',
  'OnePlus',
])

function Track({ hidden = false }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {LINES.map((line) => (
        <li key={line} className="flex items-center">
          <span className="px-5">{line}</span>
          <span aria-hidden="true" className="text-page/50">
            ✦
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AnnouncementBar() {
  return (
    <>
      <BoothAnnouncement />
      <div
        data-testid="utility-bar"
        className="overflow-hidden whitespace-nowrap bg-accent py-2 text-[14px] font-semibold text-page"
      >
        <div className="rf-marquee">
          <Track />
          <Track hidden />
        </div>
      </div>
    </>
  )
}
