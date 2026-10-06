import { Link } from 'react-router-dom'

/**
 * Shared surface and layout primitives.
 *
 * These exist because "a bordered white box with a heading and some padding"
 * appeared in nine pages with nine slightly different implementations, which is
 * how a design system quietly stops being one. Anything that is a *container*
 * rather than a *control* should be built from here.
 */

/**
 * A bordered surface.
 *
 * Corners are square-cornered and elevation is a hairline, not a shadow. A card
 * in this system is a sheet of paper on a desk, and paper has an edge rather
 * than a glow.
 */
export function Panel({ as: Tag = 'section', className = '', inset = false, children, ...rest }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-surface ${inset ? '' : 'shadow-card'} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * A panel header.
 *
 * The heading carries a monospace kicker above it. Every panel in the product
 * opens with one, which is what makes separate screens feel like one system
 * rather than a set of unrelated boxes.
 */
export function PanelHeader({
  kicker,
  title,
  description,
  actions,
  as: Heading = 'h2',
  className = '',
  children,
}) {
  return (
    <div
      className={`flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      <div className="min-w-0">
        {kicker && (
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
            {kicker}
          </p>
        )}
        <Heading className="mt-1 font-display text-lg font-bold tracking-tight text-ink">
          {title}
        </Heading>
        {description && <p className="mt-1.5 text-sm leading-body text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </div>
  )
}

/**
 * A metric cell.
 *
 * Dashboards used to open with five identical cards, each holding a label, a
 * number, and a decorative icon in a coloured square. Five identical cards
 * communicate that the five numbers are equally important, which they are not.
 *
 * `MetricStrip` instead renders them as one divided bar: the cells share edges
 * so the numbers read as a single row of readings, and the whole strip is a
 * single object rather than five competing ones. The label is monospace and
 * small, so the value is unmistakably the figure being read.
 */
export function MetricStrip({ metrics, className = '' }) {
  const columns = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  }

  return (
    <dl
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line ${
        columns[metrics.length] ?? 'sm:grid-cols-2 lg:grid-cols-4'
      } ${className}`}
    >
      {metrics.map(({ label, value, hint, to, tone }) => {
        const valueTone =
          tone === 'accent'
            ? 'text-accent-700'
            : tone === 'flare'
              ? 'text-flare-700'
              : tone === 'danger'
                ? 'text-danger'
                : 'text-ink'

        const body = (
          <>
            <dt>
              {/* The label is a paragraph inside the term rather than the term
                  itself. That is valid HTML, and it keeps the label as a real
                  block with its own type styles while leaving `dt` free to be
                  the structural wrapper. */}
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                {label}
              </p>
            </dt>
            <dd
              className={`mt-2 font-display text-3xl font-bold tabular-nums leading-none tracking-tight ${valueTone}`}
            >
              {value}
            </dd>
            {hint && <p className="mt-2 text-xs leading-snug text-muted">{hint}</p>}
          </>
        )

        return to ? (
          <Link
            key={label}
            to={to}
            className="group bg-surface px-4 py-4 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-950"
          >
            {body}
            <span className="sr-only">Open {label.toLowerCase()}</span>
          </Link>
        ) : (
          <div key={label} className="bg-surface px-4 py-4">
            {body}
          </div>
        )
      })}
    </dl>
  )
}

/**
 * A labelled row in a specification table.
 *
 * Used wherever a page needs to state facts rather than persuade: seller
 * details, order lines, listing metadata. The label column is fixed-width on
 * wide screens so the values line up and can be scanned vertically, which is
 * the difference between a spec sheet and a paragraph.
 */
export function SpecRow({ label, value, className = '' }) {
  return (
    <div
      className={`grid grid-cols-[minmax(7rem,40%)_1fr] gap-4 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[minmax(9rem,34%)_1fr] ${className}`}
    >
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

export function SpecList({ children, className = '' }) {
  return <dl className={className}>{children}</dl>
}

/**
 * A status dot + label.
 *
 * Used where a state matters but a full chip would be too loud. The dot is
 * never the only signal — the label beside it always states the state in words,
 * so the meaning survives greyscale and colour-blindness.
 */
export function StatusDot({ tone = 'neutral', label, className = '' }) {
  const dotTone = {
    accent: 'bg-accent-500',
    flare: 'bg-flare-500',
    danger: 'bg-danger',
    info: 'bg-info',
    neutral: 'bg-subtle',
  }

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span
        className={`size-2 shrink-0 rounded-full ${dotTone[tone] ?? dotTone.neutral}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}

/** A short labelled divider used inside dense panels. */
export function PanelRule({ children, className = '' }) {
  return (
    <div
      className={`flex items-center gap-3 border-t border-line px-5 py-3 sm:px-6 ${className}`}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  )
}