import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Labeled `<select>` matching the `TextField` visual language, so filter
 * dropdowns and form selects do not look like two different products.
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
          className={`mb-2 block text-sm font-semibold text-ink ${srOnlyLabel ? 'sr-only' : ''}`}
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
          className={`h-12 w-full appearance-none rounded-2xl border bg-white py-3 pl-4 pr-11 text-[15px] font-semibold text-ink shadow-sm transition duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 ${
            error ? 'border-danger focus:border-danger focus:ring-red-100' : 'border-line hover:border-slate-300'
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
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted"
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
