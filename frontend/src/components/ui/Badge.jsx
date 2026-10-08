/**
 * The trust chip.
 *
 * Badges here are square-cornered with a hairline and a monospace label, not
 * pills. The change matters: a marketplace full of rounded pastel chips reads as
 * a toy, while a small rectangle with an uppercase tracked label reads as a
 * value printed on a spec sheet. Colour still carries meaning, but every badge
 * also names its meaning in text, so nothing depends on hue alone.
 */
const toneClasses = {
  neutral: 'bg-surface-2 text-muted ring-line-2',
  primary: 'bg-primary-950 text-white ring-transparent',
  accent: 'bg-accent-50 text-accent-800 ring-accent-300',
  success: 'bg-accent-50 text-accent-800 ring-accent-300',
  flare: 'bg-flare-50 text-flare-800 ring-flare-300',
  warning: 'bg-flare-50 text-flare-800 ring-flare-300',
  danger: 'bg-red-50 text-danger ring-red-300',
  info: 'bg-info/10 text-info ring-info/30',
  outline: 'bg-white text-muted ring-line-2',
  solid: 'bg-primary-950 text-white ring-transparent',
  dark: 'bg-primary-950 text-white ring-transparent',
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px] tracking-[0.12em]',
  md: 'px-2 py-1 text-[11px] tracking-[0.1em]',
  lg: 'px-2.5 py-1.5 text-xs tracking-[0.08em]',
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  icon: Icon,
  className = '',
  children,
  ...badgeProps
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm font-mono font-semibold uppercase ring-1 ring-inset ${
        toneClasses[tone] ?? toneClasses.neutral
      } ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
      {...badgeProps}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  )
}