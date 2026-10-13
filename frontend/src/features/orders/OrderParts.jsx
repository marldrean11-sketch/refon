import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { formatDateTime, formatPeso } from '../../lib/format.js'
import { ListingPhoto } from '../listings/ListingPhoto.jsx'

export const ORDER_STATUS = {
  PLACED: { label: 'Placed', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-accent-tint text-accent' },
  SHIPPED: { label: 'Shipped', className: 'bg-accent-tint text-accent' },
  COMPLETED: { label: 'Completed', className: 'bg-accent text-page' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-danger' },
}

/** What the seller's buttons say for each next status. */
export const NEXT_STATUS_ACTION = {
  CONFIRMED: 'Confirm order',
  SHIPPED: 'Mark as shipped',
  COMPLETED: 'Mark as completed',
  CANCELLED: 'Cancel order',
}

export function OrderStatusBadge({ status }) {
  const config = ORDER_STATUS[status] ?? { label: status, className: 'bg-surface-2 text-muted' }
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${config.className}`}
    >
      {config.label}
    </span>
  )
}

/** Placed → Confirmed → Shipped → Completed, with the time each step happened. */
export function OrderTimeline({ order }) {
  if (order.status === 'CANCELLED') {
    return (
      <p className="flex items-start gap-2 text-sm text-danger">
        <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Cancelled {order.cancelledAt ? formatDateTime(order.cancelledAt) : ''}
          {order.cancelReason && <span className="block text-muted">Reason: {order.cancelReason}</span>}
        </span>
      </p>
    )
  }

  const steps = [
    { label: 'Placed', at: order.createdAt },
    { label: 'Confirmed', at: order.confirmedAt },
    { label: 'Shipped', at: order.shippedAt },
    { label: 'Completed', at: order.completedAt },
  ]

  return (
    <ol className="grid gap-3 sm:grid-cols-4" aria-label="Order progress">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2">
          {step.at ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
          )}
          <span>
            <span className={`block text-sm font-semibold ${step.at ? 'text-ink' : 'text-muted'}`}>
              {step.label}
            </span>
            {step.at && <span className="block text-xs text-muted">{formatDateTime(step.at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function OrderItems({ items }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <ListingPhoto
            src={item.photo}
            alt=""
            className="size-14 shrink-0 rounded-lg object-cover"
            fallback={
              <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-2 font-display text-lg font-bold text-subtle ring-1 ring-inset ring-line">
                {item.brand?.charAt(0) ?? 'R'}
              </span>
            }
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {item.brand} {item.model}
            </p>
            <p className="truncate text-xs text-muted">
              {[item.storage, item.color].filter(Boolean).join(' · ')}
              {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
            {formatPeso(item.lineTotal)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotals({ order }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Subtotal</dt>
        <dd className="tabular-nums text-ink">{formatPeso(order.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Delivery</dt>
        <dd className="tabular-nums text-ink">{order.deliveryFee ? formatPeso(order.deliveryFee) : 'Free'}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-line pt-1.5">
        <dt className="font-bold text-ink">Total</dt>
        <dd className="font-bold tabular-nums text-ink">{formatPeso(order.total)}</dd>
      </div>
    </dl>
  )
}

export function OrderAddress({ contact }) {
  if (!contact) return null
  return (
    <address className="text-sm not-italic leading-relaxed text-muted">
      <span className="block font-semibold text-ink">{contact.fullName}</span>
      <span className="block">{contact.street}</span>
      <span className="block">
        {[contact.barangay, contact.city].filter(Boolean).join(', ')}
      </span>
      <span className="block">
        {[contact.province, contact.region, contact.postalCode].filter(Boolean).join(', ')}
      </span>
      <span className="mt-1 block">{contact.mobile}</span>
      <span className="block">{contact.email}</span>
      {contact.deliveryNotes && <span className="mt-1 block">Notes: {contact.deliveryNotes}</span>}
    </address>
  )
}
