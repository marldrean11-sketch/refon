/**
 * The text field.
 *
 * Labels are monospace, uppercase, and small. That is a deliberate departure
 * from the sans-serif label the field had before, and it does real work: on a
 * page with a large display face and a small body face, a *third* voice for the
 * form tells you immediately that the small grey text above an input is a
 * label and not a caption.
 *
 * The field is a well with a hairline that thickens to Obsidian on focus. There
 * is no glow and no lift — an input is a slot for text, and everything else
 * competes with the thing the user is about to type into.
 *
 * `required` marks the field with a monospace asterisk rather than relying on the
 * browser's own validation bubble, and the legend-style label carries the
 * word "optional" when a field is genuinely optional, because a form where
 * everything looks mandatory trains people to ignore the markers.
 */
export function TextField({
  id,
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  endAdornment,
  required = false,
  optional = false,
  ...inputProps
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label
          htmlFor={id}
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink"
        >
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
          {optional ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-subtle">
              optional
            </span>
          ) : null}
        </label>
      </div>

      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
            strokeWidth={1.9}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`h-12 w-full rounded-control border bg-surface py-2.5 text-[15px] text-ink transition duration-150 placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary-950/15 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${endAdornment ? 'pr-12' : 'pr-3.5'} ${
            error
              ? 'border-danger focus:border-danger focus:ring-red-100'
              : 'border-line-2 hover:border-line-2 focus:border-primary-950'
          }`}
          {...inputProps}
        />
        {endAdornment && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}