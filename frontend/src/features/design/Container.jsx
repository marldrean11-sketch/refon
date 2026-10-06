/**
 * The page gutter.
 *
 * Every page previously spelled its own width and padding — `mx-auto max-w-7xl`
 * appears 29 times and mixes `px-4` with `px-5` — which is why content sat at
 * slightly different left edges depending on which page you were on. This is the
 * single place that is decided.
 *
 * Deliberately a plain wrapper: it sets horizontal rhythm and nothing else, so a
 * caller can put any spacing or layout inside it without fighting the container.
 */
const WIDTHS = {
  /** Standard marketplace width. The default for almost every page. */
  default: 'max-w-7xl',
  /** Long-form reading: policies, about, quality check. */
  prose: 'max-w-3xl',
  /** Short forms where the field column should stay narrow. */
  narrow: 'max-w-2xl',
  /** Full-bleed: the gutter is kept but no maximum width is imposed. */
  full: '',
}

export function Container({
  as: Tag = 'div',
  size = 'default',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${WIDTHS[size] ?? WIDTHS.default} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
