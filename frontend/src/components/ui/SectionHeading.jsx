/**
 * Section heading with an optional eyebrow, lead paragraph, and aligned CTA.
 *
 * Every major section on the marketing pages uses this so the type scale and
 * spacing never drift between sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'dark',
  action,
  className = '',
  children,
}) {
  const isCentered = align === 'center'

  const titleColor = tone === 'light' ? 'text-white' : 'text-ink'
  const descriptionColor = tone === 'light' ? 'text-primary-100/80' : 'text-muted'
  const eyebrowColor = tone === 'light' ? 'text-accent-300' : 'text-primary-600'

  return (
    <div
      className={`${isCentered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      {eyebrow && (
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${eyebrowColor}`}>{eyebrow}</p>
      )}
      <h2 className={`mt-3 font-display font-bold tracking-tight ${titleColor} ${
        isCentered ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl'
      }`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-body sm:text-lg ${descriptionColor}`}>{description}</p>
      )}
      {children}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
