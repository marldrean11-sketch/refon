import { AlertTriangle, RotateCcw, SearchX } from 'lucide-react'
import { Button, ButtonLink } from './Button.jsx'

/**
 * Shared empty, error, and no-results states.
 *
 * Every copy here is written as a next action, because an empty state with no
 * route out of it is a dead end for the shopper.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-card-lg border border-dashed border-line bg-white text-center ${
        compact ? 'px-6 py-8' : 'px-6 py-14'
      } ${className}`}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon className="size-6" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h3 className={`mt-5 font-display font-semibold text-ink ${compact ? 'text-lg' : 'text-2xl'}`}>
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-body text-muted">{description}</p>
      )}
      {(actionLabel && actionHref) || onAction ? (
        <div className="mt-6">
          {actionHref ? (
            <ButtonLink to={actionHref} variant="primary" size="md">
              {actionLabel}
            </ButtonLink>
          ) : (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center rounded-card-lg border border-red-100 bg-red-50/60 px-6 py-12 text-center ${className}`}
      role="alert"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-white text-danger shadow-sm">
        <AlertTriangle className="size-6" strokeWidth={2} aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-body text-muted">
        {description ?? 'Please try again. If the problem continues, refresh the page.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="md" className="mt-6" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

/** The copy the brief asks for when filters exclude everything. */
export function NoResultsState({ onClearFilters, className = '' }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No phones found"
      description="Try adjusting your filters, widening the price range, or clearing the search to see more tested devices."
      actionLabel={onClearFilters ? 'Clear all filters' : undefined}
      onAction={onClearFilters}
      className={className}
    />
  )
}

/** The copy the brief asks for when a visitor has not added anything yet. */
export function EmptyCartState({ actionLabel = 'Browse Refurbished Phones', actionHref = '/phones' }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Your cart is waiting for its next upgrade."
      description="Every phone you add shows its condition grade, battery health, and warranty before checkout."
      actionLabel={actionLabel}
      actionHref={actionHref}
    />
  )
}
