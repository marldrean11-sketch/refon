const toneClasses = {
  neutral: 'bg-canvas text-muted ring-line',
  primary: 'bg-primary-50 text-primary-800 ring-primary-200',
  accent: 'bg-accent-50 text-accent-800 ring-accent-200',
  success: 'bg-accent-50 text-accent-800 ring-accent-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-danger ring-red-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  outline: 'bg-white text-muted ring-line',
  solid: 'bg-primary-500 text-white ring-transparent',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
  lg: 'px-3 py-1.5 text-xs',
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
      className={`inline-flex items-center gap-1.5 rounded-pill font-bold uppercase tracking-[0.1em] ring-1 ring-inset ${
        toneClasses[tone] ?? toneClasses.neutral
      } ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
      {...badgeProps}
    >
      {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />}
      {children}
    </span>
  )
}
