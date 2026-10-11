const COLORS = ['#c6ff3d', '#f2f4f0', '#ffb547', '#3df2ff']

/** Evenly spread flight paths, fixed so every burst looks the same. */
const PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const radius = 60 + (i % 3) * 22
  return {
    dx: `${Math.round(Math.cos(angle) * radius)}px`,
    dy: `${Math.round(Math.sin(angle) * radius * 0.7 - 24)}px`,
    color: COLORS[i % COLORS.length],
  }
})

/**
 * A small one-shot confetti burst from the centre of its positioned parent.
 *
 * Rendered only while `active`; change `burstKey` to fire it again. Decorative
 * and `aria-hidden`; the event it celebrates is announced by the caller (a toast
 * or a status message). Reduced motion collapses the flight to nothing.
 */
export function Confetti({ active, burstKey = 0 }) {
  if (!active) return null

  return (
    <span key={burstKey} aria-hidden="true" className="pointer-events-none absolute inset-0 z-raised">
      {PIECES.map((piece) => (
        <span
          key={`${piece.dx}${piece.dy}`}
          className="rf-confetti"
          style={{ '--dx': piece.dx, '--dy': piece.dy, background: piece.color }}
        />
      ))}
    </span>
  )
}
