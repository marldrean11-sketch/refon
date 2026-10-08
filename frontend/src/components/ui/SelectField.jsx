import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Labelled `<select>`.
 *
 * The native control is restyled rather than replaced: it keeps keyboard
 * behaviour, the platform picker on touch, and correct form semantics, which a
 * custom listbox would all have to re-implement badly. `appearance-none` plus a
 * drawn chevron is what keeps it looking like the rest of the product.
 */
export function SelectField({
  label,
  hint,
  error,
  options = [],
  value,
  onChange,
  id: providedId,
  className = '',
  selectClassName = '',
  srOnlyLabel = false,
  ...selectProps
}) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={`mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink ${
            srOnlyLabel ? 'sr-only' : ''
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full appearance-none rounded-control border bg-surface pl-3.5 pr-10 font-medium text-ink transition duration-150 focus:outline-none focus:ring-2 focus:ring-primary-950/15 ${
            error
              ? 'h-11 border-danger focus:border-danger focus:ring-red-100'
              : 'h-12 border-line-2 text-[15px] font-semibold hover:border-primary-400 focus:border-primary-950'
          } ${selectClassName}`}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
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