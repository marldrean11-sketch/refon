/**
 * A titled block in the checkout flow.
 *
 * Wraps each step with a consistent heading, an optional step number, and a
 * description, so the four checkout sections read as one document instead of four
 * unrelated cards.
 */
export function CheckoutSection({
  step,
  title,
  description,
  children,
  className = '',
  headingId,
  ...sectionProps
}) {
  return (
    <section
      className={`rounded-card-lg border border-line bg-white shadow-card ${className}`}
      aria-labelledby={headingId}
      {...sectionProps}
    >
      <header className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3.5">
          {step && (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-page"
              aria-hidden="true"
            >
              {step}
            </span>
          )}
          <div className="min-w-0">
            <h2
              id={headingId}
              className="font-display text-lg font-bold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}
