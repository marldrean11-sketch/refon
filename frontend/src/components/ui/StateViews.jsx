import { AlertTriangle, RotateCcw, SearchX, ShoppingBag } from 'lucide-react'
import { Button, ButtonLink } from './Button.jsx'

/**
 * Shared empty, error, and no-results states.
 *
 * These are designed, not defaulted. An empty state in a marketplace is not an
 * apology, it is the moment to explain what the space is for and offer the one
 * action that fills it — so each one names the situation, says what will put
 * something there, and routes out.
 *
 * The visual language is deliberately not the friendly rounded illustration the
 * old states used: a hairline frame, a square-cornered mark, a monospace
 * category line, and a single hard-edged action. It should look like a labelled
 * slot waiting to be filled, which is what it is.
 */
function StateFrame({ icon: Icon, kicker, title, description, actions, tone = 'neutral', className = '' }) {
  const frameTone =
    tone === 'danger'
      ? 'border-danger/40 bg-danger/[0.04]'
      : tone === 'positive'
        ? 'border-accent-300 bg-accent-50/50'
        : 'border-line-2 bg-surface'

  const iconTone =
    tone === 'danger'
      ? 'bg-danger/10 text-danger'
      : tone === 'positive'
        ? 'bg-accent-100 text-accent-800'
        : 'bg-surface-2 text-primary-700'

  return (
    <div
      className={`flex flex-col items-center border ${frameTone} px-6 py-12 text-center sm:px-10 sm:py-16 ${className}`}
    >
      <span className={`grid size-14 place-items-center rounded-control ${iconTone}`}>
        <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      {kicker && (
        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          {kicker}
        </p>
      )}
      <h3 className="mt-2 max-w-lg font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {title}
      </h3>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-body text-muted">{description}</p>
      )}
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon = SearchX,
  kicker = 'Nothing here yet',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  className = '',
}) {
  const actions =
    (actionLabel && actionHref) || onAction || secondaryActionHref ? (
      <>
        {actionLabel && actionHref ? (
          <ButtonLink to={actionHref} variant="primary" size="md">
            {actionLabel}
          </ButtonLink>
        ) : null}
        {onAction ? (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
        {secondaryActionHref ? (
          <ButtonLink to={secondaryActionHref} variant="secondary" size="md">
            {secondaryActionLabel ?? 'Browse the shop'}
          </ButtonLink>
        ) : null}
      </>
    ) : null

  return (
    <StateFrame
      icon={Icon}
      kicker={kicker}
      title={title}
      description={description}
      actions={actions}
      className={className}
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  kicker = 'Request failed',
  description,
  onRetry,
  className = '',
}) {
  return (
    <StateFrame
      icon={AlertTriangle}
      tone="danger"
      kicker={kicker}
      title={title}
      description={description ?? 'Please try again. If the problem continues, refresh the page.'}
      actions={
        onRetry ? (
          <Button variant="danger" size="md" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        ) : null
      }
      className={className}
    />
  )
}

/** The copy the brief asks for when filters exclude everything. */
export function NoResultsState({ onClearFilters, className = '' }) {
  return (
    <EmptyState
      icon={SearchX}
      kicker="No matches"
      title="No phones found"
      description="Try widening the price range, dropping the battery minimum, or clearing the search to see more tested devices."
      actionLabel={onClearFilters ? 'Clear all filters' : undefined}
      onAction={onClearFilters}
      className={className}
    />
  )
}

/**
 * The empty cart.
 *
 * Lead with the plain fact, then explain what a ReFon cart does that a generic
 * basket does not — a phone added here is held for a short window, which is why
 * coming back to it is worth doing.
 */
export function EmptyCartState({ actionLabel = 'Browse Refurbished Phones', actionHref = '/phones' }) {
  return (
    <EmptyState
      icon={ShoppingBag}
      kicker="Cart"
      title="Your cart is empty"
      description="Find a refurbished phone that fits your budget. Every phone you add shows its condition grade, battery health, and warranty, and is held for you while you decide."
      actionLabel={actionLabel}
      actionHref={actionHref}
    />
  )
}