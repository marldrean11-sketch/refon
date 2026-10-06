/**
 * Section heading.
 *
 * One definition of the type ramp for every section on every page. The old
 * version mixed a 3xl/4xl heading with 4xl/18px body copy, which made the body
 * of a section compete with the heading above it; the description is now always
 * quieter than the title it supports.
 *
 * `tone="dark"` means "dark text on a light surface", which is confusing enough
 * that it is spelled out here rather than left to the caller to reason about.
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

  const titleColor = tone === 'light' ? 'text-white' : 'text-ink'
  const descriptionColor = tone === 'light' ? 'text-primary-300' : 'text-muted'
  const eyebrowColor = tone === 'light' ? 'text-accent-300' : 'text-subtle'

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