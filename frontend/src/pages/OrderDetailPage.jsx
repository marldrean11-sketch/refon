import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Store, Truck, Wallet } from 'lucide-react'
import { Container } from '../features/design/Container.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { cancelMyOrderRequest, getMyOrderRequest } from '../features/orders/order-api.js'
import {
  OrderAddress,
  OrderItems,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotals,
} from '../features/orders/OrderParts.jsx'
import { OrderReviewForm } from '../features/orders/OrderReviewForm.jsx'
import { formatDateTime } from '../lib/format.js'
import { DASHBOARD_ROUTES, sellerPath } from '../lib/routes.js'

/**
 * Where to send the money for a GCash, Maya or bank order. The seller's details
 * arrive once they confirm the order; until then the buyer is told to wait.
 */
function PaymentInstructions({ order }) {
  if (order.payment.id === 'cod' || order.status === 'CANCELLED') return null
  if (order.status === 'PLACED') {
    return (
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Don&rsquo;t pay yet. The seller&rsquo;s payment details appear here once they confirm
        your order.
      </p>
    )
  }

  const details = order.seller?.paymentDetails
  const rows = [
    ['GCash', details?.gcash],
    ['Maya', details?.maya],
    ['Bank', details?.bank],
  ].filter(([, value]) => value)

  if (!details || (rows.length === 0 && !details.qr)) {
    return (
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        The seller has not added payment details yet. Message them to ask how to pay.
      </p>
    )
  }

  return (
    <div className="mt-3 rounded-control border border-accent/40 bg-panel p-3" data-testid="seller-payment-details">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Pay the seller</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-12 shrink-0 text-muted">{label}</dt>
            <dd className="break-words font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {details.qr && (
        <img
          src={details.qr}
          alt="Seller payment QR code"
          className="mt-3 size-36 rounded-xl border border-line bg-white object-contain"
        />
      )}
      {details.note && <p className="mt-2 text-xs leading-relaxed text-muted">{details.note}</p>}
    </div>
  )
}

/** One of the buyer's orders: progress, phones, money, address, and cancel. */
export function OrderDetailPage() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await getMyOrderRequest(orderNumber)
      setOrder(response.order)
    } catch (requestError) {
      setError(requestError)
    }
  }, [orderNumber])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load().catch(() => {})
  }, [load])

  async function handleCancel() {
    if (!window.confirm(`Cancel order ${order.orderNumber}? The phones go back on sale.`)) return
    setIsCancelling(true)
    setActionError('')
    try {
      const response = await cancelMyOrderRequest(order.orderNumber)
      setOrder(response.order)
    } catch (requestError) {
      setActionError(requestError.message ?? 'The order could not be cancelled.')
      load().catch(() => {})
    } finally {
      setIsCancelling(false)
    }
  }

  const card = 'rounded-card border border-line bg-surface p-5 sm:p-6'

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <Container className="py-8 sm:py-10">
        <Link
          to={DASHBOARD_ROUTES.orders}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          My Orders
        </Link>

        {error ? (
          <p role="alert" className="mt-6 flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : !order ? (
          <div className="mt-6 space-y-3" role="status" aria-label="Loading order">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-ink sm:text-3xl">{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>

            <div className="mt-6 space-y-4">
              <section className={card}>
                <OrderTimeline order={order} />
              </section>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <section className={card}>
                  <h2 className="font-display text-lg font-bold text-ink">Phones</h2>
                  <OrderItems items={order.items} />
                  <div className="mt-3 border-t border-line pt-3">
                    <OrderTotals order={order} />
                  </div>
                </section>

                <section className={`${card} space-y-4`}>
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Store className="size-4" aria-hidden="true" />
                      Seller
                    </h2>
                    <p className="mt-1 text-sm text-ink">
                      <Link to={sellerPath(order.seller?.id)} className="hover:text-accent">
                        {order.seller?.businessName}
                      </Link>
                    </p>
                    <p className="text-xs text-muted">{order.seller?.contactInfo}</p>
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Truck className="size-4" aria-hidden="true" />
                      Delivery
                    </h2>
                    <p className="mt-1 text-sm text-muted">{order.delivery.label}</p>
                    <div className="mt-2">
                      <OrderAddress contact={order.contact} />
                    </div>
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Wallet className="size-4" aria-hidden="true" />
                      Payment
                    </h2>
                    <p className="mt-1 text-sm text-muted">{order.payment.label}</p>
                    <PaymentInstructions order={order} />
                  </div>
                </section>
              </div>

              {order.status === 'COMPLETED' && (
                <section className={card} data-testid="order-reviews">
                  <h2 className="font-display text-lg font-bold text-ink">Review your phones</h2>
                  <p className="mt-1 text-sm text-muted">
                    Help other buyers: tell them how the phone and the seller turned out.
                  </p>
                  <ul className="mt-3 divide-y divide-line">
                    {order.items.map((item) => (
                      <li key={item.id} className="py-3">
                        <p className="text-sm font-semibold text-ink">
                          {item.brand} {item.model}
                          <span className="font-normal text-muted"> · {item.storage}</span>
                        </p>
                        <div className="mt-2">
                          <OrderReviewForm
                            orderNumber={order.orderNumber}
                            item={item}
                            onReviewed={(listingId) =>
                              setOrder((current) => ({
                                ...current,
                                items: current.items.map((entry) =>
                                  entry.listingId === listingId ? { ...entry, reviewed: true } : entry,
                                ),
                              }))
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {order.status === 'PLACED' && (
                <section className={card}>
                  <p className="text-sm text-muted">
                    Changed your mind? You can cancel until the seller confirms the order. If the
                    seller does not confirm it within 48 hours, it is cancelled automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="mt-3 inline-flex h-10 items-center rounded-control border border-danger px-4 text-sm font-semibold text-danger transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelling…' : 'Cancel order'}
                  </button>
                  {actionError && (
                    <p role="alert" className="mt-2 text-sm text-danger">
                      {actionError}
                    </p>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </Container>
    </div>
  )
}
