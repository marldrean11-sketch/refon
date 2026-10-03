import { BadgeCheck, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BrandMark({
  inverse = false,
  compact = false,
  className = '',
  onClick,
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="ReFon home"
      className={`inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${className}`}
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500 text-white shadow-card">
        <Smartphone className="size-5" strokeWidth={2.2} aria-hidden="true" />
        <BadgeCheck
          className="absolute -bottom-1.5 -right-1.5 size-5 rounded-full bg-accent-500 text-white ring-2 ring-white"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </span>
      {!compact && (
        <span
          className={`font-display text-2xl font-bold tracking-tight ${
            inverse ? 'text-white' : 'text-ink'
          }`}
        >
          ReFon
        </span>
      )}
    </Link>
  )
}
