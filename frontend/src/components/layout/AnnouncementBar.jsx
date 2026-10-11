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
    <div
      data-testid="utility-bar"
      className="overflow-hidden whitespace-nowrap bg-accent py-2 text-[14px] font-semibold text-page"
    >
      <div className="rf-marquee">
        <Track />
        <Track hidden />
      </div>
    </div>
  )
}
