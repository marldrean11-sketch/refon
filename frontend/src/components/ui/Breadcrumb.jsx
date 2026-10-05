import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Breadcrumb trail. The last crumb is the current page and is marked
 * `aria-current` instead of being a link, so it is not a dead click.
 */
export function Breadcrumb({ items = [], className = '' }) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="rounded transition hover:text-primary-700 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-ink">
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
