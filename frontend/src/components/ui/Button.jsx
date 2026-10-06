import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-control font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55'

/**
 * One set of button shapes for the whole site.
 *
 * The 8px `rounded-control` radius is what stops a dense marketplace interface
 * reading as soft and rounded-off. The hover lift is 1px rather than 2px for the
 * same reason: a half-pixel of travel is a change in emphasis, two pixels is a bounce.
 *
 * The global `prefers-reduced-motion` rule in `index.css` collapses `transition-duration`,
 * so the lift still applies but arrives instantly rather than as movement. That is
 * intentional and is why the value lives here in a variant rather than in a
 * per-page utility.
 */
const variantClasses = {
  primary:
    'bg-primary-500 text-white shadow-card hover:-translate-y-px hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0',
  accent:
    'bg-accent-600 text-white shadow-card hover:-translate-y-px hover:bg-accent-700 hover:shadow-card-hover active:translate-y-0',
  secondary:
    'border border-line bg-white text-primary-700 shadow-sm hover:-translate-y-px hover:border-primary-200 hover:bg-primary-50 hover:shadow-card',
  outline: 'border border-primary-200 bg-transparent text-primary-700 hover:bg-primary-50',
  ghost: 'bg-transparent text-muted hover:bg-primary-50 hover:text-primary-700',
  danger:
    'border border-red-200 bg-white text-danger hover:-translate-y-px hover:bg-red-50 hover:shadow-card',
  dark: 'bg-primary-950 text-white shadow-card hover:-translate-y-px hover:bg-primary-900',
}

const sizeClasses = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-7 text-base',
  icon: 'size-11 p-0',
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
