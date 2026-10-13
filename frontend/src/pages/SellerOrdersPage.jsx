import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Package, Truck, User, Wallet } from 'lucide-react'
import { Container } from '../features/design/Container.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import {
  getSellerOrdersRequest,
  updateSellerOrderStatusRequest,
} from '../features/orders/order-api.js'
import {
  NEXT_STATUS_ACTION,
  ORDER_STATUS,
  OrderAddress,
  OrderItems,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotals,
} from '../features/orders/OrderParts.jsx'
import { formatDateTime } from '../lib/format.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/**
 * The seller's incoming orders. Each card moves its order one step along
 * Placed → Confirmed → Shipped → Completed, or cancels it before it ships
 * (which puts the phone back on sale).
 */
export function SellerOrdersPage() {
  const [status, setStatus] = useState('')
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (filter) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getSellerOrdersRequest(filter)
      setOrders(response.orders)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load(status).catch(() => {})
  }, [load, status])

  function replaceOrder(next) {
    setOrders((current) => current.map((order) => (order.id === next.id ? next : order)))
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <Link
            to={AUTH_ROUTES.seller}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Seller Dashboard
          </Link>
          <h1 className="mt-4 font-display text-[2.25rem] font-bold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
            Orders
          </h1>
          <p className="mt-2.5 max-w-2xl leading-body text-muted">
            Confirm new orders, mark them shipped, and complete them once the buyer has the
            phone. Cancelling before shipping puts the phone back on sale.
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter orders">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={`rounded-control px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                  status === filter.value ? 'bg-accent text-page' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {isLoading && orders.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading orders">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-40 w-full" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : orders.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-2 bg-surface px-6 py-14 text-center">
            <Package className="mx-auto size-8 text-subtle" aria-hidden="true" />
            <h2 className="mt-4 font-display text-xl font-bold text-ink">No orders here yet</h2>
            <p className="mt-2 text-sm text-muted">When a buyer checks out your phone, the order lands here.</p>
          </div>
        ) : (
          <ul className={`space-y-4 ${isLoading ? 'opacity-60' : ''}`}>
            {orders.map((order) => (
              <li key={order.id}>
                <SellerOrderCard order={order} onUpdated={replaceOrder} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  )
}

function SellerOrderCard({ order, onUpdated }) {
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  async function move(nextStatus) {
    let reason = ''
    if (nextStatus === 'CANCELLED') {
      const answer = window.prompt(
        `Cancel order ${order.orderNumber}? The phone goes back on sale.\nReason for the buyer (optional):`,
        '',
      )
      if (answer === null) return
      reason = answer
    }
    setBusy(nextStatus)
    setActionError('')
    try {
      const response = await updateSellerOrderStatusRequest(order.id, nextStatus, reason)
      onUpdated(response.order)
    } catch (requestError) {
      setActionError(requestError.message ?? 'The order could not be updated.')
    } finally {
      setBusy('')
    }
  }

  return (
    <article className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-ink">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
          </p>
          <p className="mt-1 text-xs text-muted">Placed {formatDateTime(order.createdAt)}</p>
          {order.status === 'PLACED' && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Confirm within 48 hours, or the order is cancelled automatically.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {order.nextStatuses.map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => move(next)}
              disabled={Boolean(busy)}
              className={`inline-flex h-10 items-center rounded-control px-4 text-sm font-semibold transition disabled:opacity-50 ${
                next === 'CANCELLED'
                  ? 'border border-danger text-danger hover:bg-red-50'
                  : 'bg-accent text-page hover:bg-accent-hover'
              }`}
            >
              {busy === next ? 'Saving…' : NEXT_STATUS_ACTION[next] ?? ORDER_STATUS[next]?.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <OrderTimeline order={order} />
      </div>

      <div className="mt-4 grid gap-5 border-t border-line pt-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <OrderItems items={order.items} />
          <div className="mt-2 border-t border-line pt-3">
            <OrderTotals order={order} />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <User className="size-4" aria-hidden="true" />
              Buyer
            </h3>
            <p className="mt-1 text-sm text-muted">
              {order.buyer?.name} · {order.buyer?.email}
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Truck className="size-4" aria-hidden="true" />
              {order.delivery.label}
            </h3>
            <div className="mt-1">
              <OrderAddress contact={order.contact} />
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Wallet className="size-4" aria-hidden="true" />
            {order.payment.label}
          </p>
          {order.payment.id !== 'cod' && ['PLACED', 'CONFIRMED'].includes(order.status) && (
            <p className="rounded-control border border-amber-300/40 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              The buyer pays you by {order.payment.label}. After confirming, send them your{' '}
              {order.payment.label} details using their mobile or email above, and ship once
              you have received the payment.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
