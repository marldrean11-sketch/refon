import { Check } from 'lucide-react'
import { formatPeso } from '../../../lib/format.js'
import { deliveryEstimate } from '../checkout-validation.js'

/**
 * A single-option selector rendered as a real radio group.
 *
 * Radio inputs rather than buttons, because these are mutually exclusive choices and
 * a radio group is what lets arrow keys move between them and lets a screen reader
 * announce "2 of 3". A `div` with click handlers would lose both.
 *
 * The whole card is the label, so the entire area is clickable and the accessible
 * name covers the title, description, price, and estimate together.
 */
function OptionCard({ name, value, checked, onChange, title, description, meta, badge }) {
  const inputId = `${name}-${value}`

  return (
    <div
      className={`relative flex items-start gap-3.5 rounded-2xl border p-4 transition duration-200 ${
        checked
          ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500'
          : 'rf-spotlight border-line bg-white hover:-translate-y-0.5 hover:border-accent/40'
      }`}
    >
      <input
        type="radio"
        id={inputId}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />

      {/* The visible radio is drawn rather than the native control, which is styled
          here purely so the checked state reads clearly at a glance. */}
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 ${
          checked ? 'border-primary-500 bg-primary-500' : 'border-line-2 bg-white'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </span>

      <label
        htmlFor={inputId}
        className="min-w-0 flex-1 cursor-pointer"
        data-testid={`${name}-${value}`}
        data-selected={checked ? 'true' : 'false'}
      >
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-ink">{title}</span>
          {meta}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span>
        )}

        {badge && <span className="mt-2 inline-block">{badge}</span>}
      </label>
    </div>
  )
}

/** Wraps a group of option cards with a fieldset so it is announced as one group. */
function OptionGroup({ legend, description, error, children, className = '', name }) {
  const legendId = `${name}-legend`
  const errorId = `${name}-error`

  return (
    <fieldset
      className={className}
      aria-describedby={error ? errorId : undefined}
      data-testid={`${name}-group`}
    >
      <legend className="sr-only" id={legendId}>
        {legend}
      </legend>

      {description && (
        <p className="mb-3 text-sm leading-relaxed text-muted" id={`${name}-description`}>
          {description}
        </p>
      )}

      <div className="space-y-3">{children}</div>

      {error && (
        <p id={errorId} role="alert" className="mt-3 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Delivery method choices.
 *
 * Options and their fees come from the server, so this renders whatever the
 * configured catalogue says and has no fee numbers of its own. A method that is not
 * offered for the buyer's region is simply not sent to the client, so there is
 * nothing to disable here.
 */
export function DeliveryMethodSelector({ options, value, onChange, error, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="sr-only">Loading delivery methods…</span>
        {[0, 1].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl bg-well motion-reduce:animate-none" />
        ))}
      </div>
    )
  }

  return (
    <OptionGroup
      name="deliveryMethodId"
      legend="Delivery method"
      description="How quickly would you like your phone delivered?"
      error={error}
    >
      {options.map((option) => (
        <OptionCard
          key={option.id}
          name="deliveryMethodId"
          value={option.id}
          checked={value === option.id}
          onChange={onChange}
          title={option.label}
          description={option.description}
          meta={
            <span className="flex items-center gap-2">
              {/* The badge announces that the fee is waived; the figure beside it
                  stays a peso amount so the row still reads as a price row. Printing
                  "Free" twice, or a bare ₱0 with no reason, both read worse. */}
              {option.freeDelivery && (
                <span className="rounded-pill bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-800">
                  Free
                </span>
              )}
              <span className="font-display text-sm font-bold text-ink">
                {option.freeDelivery && option.originalFee ? (
                  <span className="text-muted line-through">
                    {formatPeso(option.originalFee)}
                  </span>
                ) : (
                  formatPeso(option.effectiveFee)
                )}
              </span>
            </span>
          }
          badge={
            <span className="inline-flex items-center rounded-pill bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-inset ring-line">
              {deliveryEstimate(option.minDays, option.maxDays)}
            </span>
          }
        />
      ))}
    </OptionGroup>
  )
}

/**
 * Payment method choices.
 *
 * Every option here is a preference recorded on the checkout. None of them collects
 * a credential, and the demo ones say so plainly — an interface that looked like a
 * live payment gateway would misrepresent what this build actually does.
 */
export function PaymentMethodSelector({ methods, value, onChange, error, notice }) {
  return (
    <>
      {notice && (
        <p
          className="mb-4 flex gap-2.5 rounded-2xl border border-line-2 bg-panel p-3.5 text-xs leading-relaxed text-ink"
          data-testid="demo-payment-notice"
        >
          {notice}
        </p>
      )}

      <OptionGroup
        name="paymentMethodId"
        legend="Payment method"
        description="Choose how you would like to pay. No payment details are collected."
        error={error}
      >
        {methods.map((method) => (
          <OptionCard
            key={method.id}
            name="paymentMethodId"
            value={method.id}
            checked={value === method.id}
            onChange={onChange}
            title={method.label}
            description={method.description}
            badge={
              method.demo ? (
                <span className="inline-flex items-center rounded-pill bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                  Demo payment method
                </span>
              ) : null
            }
          />
        ))}
      </OptionGroup>
    </>
  )
}
