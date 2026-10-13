import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { formatDate, formatPeso } from '../../lib/format.js'
import { getAdminOrdersRequest } from '../orders/order-api.js'
import { OrderStatusBadge } from '../orders/OrderParts.jsx'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/** Every order on ReFon for the admin: who bought what from whom, and where it stands. */
export function AdminOrdersPanel() {
  const [status, setStatus] = useState('')
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (filter) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminOrdersRequest(filter)
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

  const revenue = orders
    .filter((order) => order.status === 'COMPLETED')
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <Panel className="mt-6" data-testid="admin-orders">
      <PanelHeader
        kicker="Sales"
        title="Orders"
        description={`Every order placed on ReFon.${
          revenue ? ` Completed in this view: ${formatPeso(revenue)}.` : ''
        }`}
      />
      <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-4 sm:px-6" role="group" aria-label="Filter orders">
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
      <div className="px-5 py-4 sm:px-6">
        {error ? (
          <p role="alert" className="flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : isLoading && orders.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading orders">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className={`divide-y divide-line ${isLoading ? 'opacity-60' : ''}`}>
            {orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-ink">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {order.items.map((item) => `${item.brand} ${item.model}`).join(', ')}
                  </p>
                  <p className="text-xs text-subtle">
                    {order.buyer?.name} → {order.seller?.businessName} · {formatDate(order.createdAt)} ·{' '}
                    {order.payment.label}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{formatPeso(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
