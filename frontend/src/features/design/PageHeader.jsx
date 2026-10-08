/**
 * The heading block every interior page opens with.
 *
 * Eight pages carried a copy of the same eyebrow/H1/description markup, which is why
 * a handful of them drifted to a tighter tracking and a slightly different grey. This
 * is the one definition.
 *
 * It owns the type scale for the page title and nothing else — no border, no
 * background, no container. A page that wants the white band behind its header
 * composes that around this, so the heading stays reusable whether it sits on a
 * surface, on the canvas, or inside a dialog.
 *
 * Breadcrumbs are passed in as an already-built node using the shared `Breadcrumb`
 * component rather than a list this component re-renders itself. The existing
 * component already handles the chevron separators and `aria-current` on the final
 * crumb, and a second implementation here would only be a worse copy of it.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
  className = '',
  headingId,
}) {
  return (
    <div className={className}>
      {breadcrumb}

      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
          {eyebrow}
        </p>
      )}

      <h1
        id={headingId}
        className="mt-3 break-words font-display font-bold text-[2.5rem] leading-[1.05] text-ink sm:text-5xl"
      >
        {title}
      </h1>

      {description && (
        <p className="mt-3 max-w-2xl leading-body text-muted">{description}</p>
      )}

      {actions && <div className="mt-6">{actions}</div>}
    </div>
  )
}

/**
 * Compact heading for a section inside a page.
 *
 * Shares the type ramp with `PageHeader` so an `h2` never outranks the `h1` above
 * it, which is the mistake that made several pages read as a stack of equals.
 */
export function SectionTitle({ as: Tag = 'h2', children, className = '', id }) {
  return (
    <Tag
      id={id}
      className={`font-display font-bold tracking-tight text-ink ${className}`}
    >
      {children}
    </Tag>
  )
}
