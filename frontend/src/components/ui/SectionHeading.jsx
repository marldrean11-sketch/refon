/**
 * Section heading.
 *
 * One definition of the type ramp for every section on every page. The old
 * version mixed a 3xl/4xl heading with 4xl/18px body copy, which made the body
 * of a section compete with the heading above it; the description is now always
 * quieter than the title it supports.
 *
 * `tone` no longer accepts `light`. It used to mean "white text for a dark
 * surface", which paired with the `dark` section tone that the redesign removed;
 * a heading that has to invert is a heading that has lost its place in the
 * hierarchy. `accent` is available for the one case that still earns emphasis.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'dark',
  action,
  as: HeadingTag = 'h2',
  className = '',
  children,
}) {
  const isCentered = align === 'center'

  const titleColor = tone === 'accent' ? 'text-accent-strong' : 'text-ink'
  const descriptionColor = 'text-muted'
  const eyebrowColor = tone === 'accent' ? 'text-accent-strong' : 'text-subtle'

  return (
    <div
      className={`${isCentered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      {eyebrow && (
        <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowColor}`}>
          {eyebrow}
        </p>
      )}
      <HeadingTag
        className={`mt-3 text-title font-bold tracking-tight ${titleColor}`}
      >
        {title}
      </HeadingTag>
      {description && (
        <p className={`mt-3.5 leading-body ${descriptionColor}`}>{description}</p>
      )}
      {children}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}