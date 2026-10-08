import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * One set of button shapes for the whole site.
 *
 * The primary action is Obsidian, not a brand hue. On a page whose only saturated
 * colours are trust-jade and value-solar, a near-black button is the loudest
 * object on screen, and a black button is also the one control that reads as
 * hardware rather than software.
 *
 * Corners are 4px and travel on hover is 0. Pressed and hovered states are
 * distinguished by surface and border rather than by motion, because motion
 * alone is invisible to anyone who does not look for it — and the whole point
 * of a control is that people look at it.
 */
const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-55'

const variantClasses = {
  primary:
    'bg-primary-950 text-white ring-1 ring-inset ring-primary-950 hover:bg-primary-800 active:bg-primary-900',
  accent:
    'bg-accent-600 text-white ring-1 ring-inset ring-accent-600 hover:bg-accent-700 active:bg-accent-800',
  /**
   * The vivid brand green, carried as a filled action.
   *
   * The label is near-black rather than white, and that is a contrast decision
   * rather than a stylistic one. White on the brand green `#10B981` is 2.54:1 and
   * even on the `accent-600` step the existing `accent` variant uses it is only
   * 3.23:1, so both fall short of the 4.5:1 AA threshold for a 15px label. Ink on
   * the same fill is 7.60:1, and it keeps the exact accent the design system
   * specifies instead of substituting a darker green that is not the brand hue.
   *
   * Hover steps *darker* (`accent-hover`), which is the opposite of a tint
   * convention but is what keeps the ratio above 4.5:1; `accent-strong` at 4.42:1
   * is deliberately not used here.
   */
  brand:
    'bg-accent text-dark ring-1 ring-inset ring-accent-hover hover:bg-accent-hover active:bg-accent-300',
  /**
   * A quiet, bordered, low-stakes destructive action.
   *
   * Reads as a control rather than as a label — the `ghost` variant next to a
   * bordered button had no ring, no fill, and no underline, so it looked like
   * stray text.
   *
   * The label is `text-muted` (5.36:1 on white), *not* `text-danger`: `#EF4444` on
   * white is 3.76:1 and fails AA at this size, which is the same defect the
   * existing `danger-outline` variant has. The red arrives on hover, at
   * `red-700` so that state passes too.
   */
  'quiet-danger':
    'bg-transparent text-muted ring-1 ring-inset ring-line-2 hover:bg-red-50 hover:text-red-700 hover:ring-red-300',
  secondary:
    'bg-white text-primary-900 ring-1 ring-inset ring-line-2 hover:bg-surface-2 hover:ring-primary-400',
  outline:
    'bg-transparent text-primary-900 ring-1 ring-inset ring-primary-300 hover:bg-primary-950 hover:text-white hover:ring-primary-950',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-danger text-white ring-1 ring-inset ring-danger hover:bg-red-700 active:bg-red-800',
  'danger-outline':
    'bg-white text-danger ring-1 ring-inset ring-red-300 hover:bg-red-50 hover:ring-red-400',
  dark: 'bg-primary-950 text-white ring-1 ring-inset ring-primary-950 hover:bg-primary-800',
  light: 'bg-white text-primary-950 ring-1 ring-inset ring-white hover:bg-primary-50',
}

const sizeClasses = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[3.25rem] px-7 text-base',
  icon: 'size-11 p-0',
  'icon-sm': 'size-9 p-0',
}

function classesFor({ variant = 'primary', size = 'md', fullWidth = false, className = '' }) {
  return [
    baseClasses,
    variantClasses[variant] ?? variantClasses.primary,
    sizeClasses[size] ?? sizeClasses.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...buttonProps
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classesFor({ variant, size, fullWidth, className })}
      {...buttonProps}
    >
      {loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

/**
 * Same visual language as `Button` for navigation, so a link styled as a button
 * and a real button never drift apart. Renders a router `Link` when `to` is set
 * and a plain anchor otherwise.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  to,
  ...linkProps
}) {
  const classes = classesFor({ variant, size, fullWidth, className })

  if (to) {
    return (
      <Link to={to} className={classes} {...linkProps}>
        {children}
      </Link>
    )
  }

  return (
    <a className={classes} {...linkProps}>
      {children}
    </a>
  )
}