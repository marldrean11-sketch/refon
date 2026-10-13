import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronRight, Package } from 'lucide-react'
import { Container } from '../features/design/Container.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { getMyOrdersRequest } from '../features/orders/order-api.js'
import { OrderStatusBadge } from '../features/orders/OrderParts.jsx'
import { ListingPhoto } from '../features/listings/ListingPhoto.jsx'
import { formatDate, formatPeso } from '../lib/format.js'
import { MARKETPLACE_ROUTES, orderPath } from '../lib/routes.js'

/** The buyer's orders, newest first. Each row opens the order's detail page. */
export function MyOrdersPage() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getMyOrdersRequest()
      setOrders(response.orders)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load().catch(() => {})
  }, [load])

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
            Your purchases
          </p>
          <h1 className="mt-3 font-display text-[2.25rem] font-bold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
            My Orders
          </h1>
          <p className="mt-2.5 max-w-2xl leading-body text-muted">
            Follow each order from placed to delivered. You can cancel an order until the
            seller confirms it.
          </p>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading your orders">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-24 w-full" />
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
            <h2 className="mt-4 font-display text-xl font-bold text-ink">No orders yet</h2>
            <p className="mt-2 text-sm text-muted">Phones you buy will show up here.</p>
            <Link
              to={MARKETPLACE_ROUTES.shop}
              className="mt-6 inline-flex h-11 items-center rounded-control bg-accent px-5 text-sm font-bold text-page"
            >
              Browse phones
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const first = order.items[0]
              return (
                <li key={order.id}>
                  <Link
                    to={orderPath(order.orderNumber)}
                    className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition hover:border-line-2 sm:p-5"
                  >
                    <ListingPhoto
                      src={first?.photo}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover"
                      fallback={
                        <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-surface-2 font-display text-xl font-bold text-subtle">
                          {first?.brand?.charAt(0) ?? 'R'}
                        </span>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-ink">{order.orderNumber}</span>
                        <OrderStatusBadge status={order.status} />
                      </p>
                      <p className="mt-1 truncate text-sm text-ink">
                        {first ? `${first.brand} ${first.model}` : 'Order'}
                        {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDate(order.createdAt)} · {order.seller?.businessName}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums text-ink">{formatPeso(order.total)}</span>
                      <ChevronRight className="ml-auto mt-1 size-4 text-subtle" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </div>
  )
}
