/**
 * The right-side cart drawer.
 *
 * It exists because the cart is a decision surface, not a page. A shopper who
 * adds a phone from the shop and is then sent to a full-page cart has lost their
 * place and their scroll position; the drawer answers "what did I just reserve,
 * and what does it cost" in place, and offers the real cart page and checkout as
 * the deliberate next steps.
 *
 * No cart logic lives here. It reads `useCart` and calls the same
 * `removeListing` / `emptyCart` the cart page calls; the subtotal is the server's
 * number and is only ever displayed, never computed.
 *
 * Motion is a spring rather than the entrance easing because the panel is
 * following a pointer — a shopper who clicks the cart icon expects the drawer to
 * arrive with the hand that summoned it, and a fixed-duration curve always feels
 * slightly late. Only `x` and `opacity` move; the panel is `position: fixed`, so
 * nothing in the page reflows while it is open.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Minus, Phone, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import { Button, ButtonLink } from '../../components/ui/Button.jsx'
import { PriceInline } from '../../components/ui/PriceDisplay.jsx'
import { formatPeso } from '../../lib/format.js'
import { AnimatedAmount } from './AnimatedAmount.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { DeviceThumb } from '../cart/components/DeviceThumb.jsx'
import { useCart } from '../cart/useCart.js'
import {
  blockingItems,
  deviceModel,
  deviceVariant,
  lineTotal,
} from '../cart/cart-state.js'
import { MARKETPLACE_ROUTES, productPath } from '../../lib/routes.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'
import { FREE_DELIVERY_THRESHOLD } from '../../lib/delivery-policy.js'
import { useNavbarUi } from './navbar-ui-context.jsx'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The drawer itself, sliding on `x`. */
const SPRING = { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 }

export function CartDrawer({ triggerRef }) {
  const { isCartOpen, close } = useNavbarUi()
  const reducedMotion = usePrefersReducedMotion()
  const { cart, removeListing, emptyCart, isMutating } = useCart()

  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [removingId, setRemovingId] = useState(null)

  const titleId = useId()

  const items = cart?.items ?? []
  const itemCount = cart?.itemCount ?? 0
  const subtotal = Number(cart?.subtotal ?? 0)
  const blocking = blockingItems(items)
  const canCheckout = itemCount > 0 && blocking.length === 0

  // Scroll lock. Every overlay in the app sets this the same way; the previous
  // value is captured and restored so nested overlays do not fight.
  useEffect(() => {
    if (!isCartOpen) {
      return undefined
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [isCartOpen])

  // Open lands on the close button, not the panel, so the first Tab moves
  // *into* the drawer rather than out of it.
  useEffect(() => {
    if (!isCartOpen) {
      return undefined
    }

    closeRef.current?.focus()

    // Copied to a local so the cleanup targets the trigger that opened *this*
    // drawer, not whatever the ref points at when it runs.
    const trigger = triggerRef?.current

    return () => {
      trigger?.focus()
    }
  }, [isCartOpen, triggerRef])

  useEffect(() => {
    if (!isCartOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])].filter(
        (node) => node.offsetParent !== null,
      )

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, isCartOpen])

  async function handleRemove(listingId) {
    setRemovingId(listingId)
    try {
      await removeListing(listingId)
    } finally {
      setRemovingId(null)
    }
  }

  async function handleEmpty() {
    await emptyCart()
    close()
  }

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const progress = Math.min(1, subtotal / FREE_DELIVERY_THRESHOLD)

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            key="cart-backdrop"
            data-testid="cart-backdrop"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-drawer bg-black/45"
          />

          <motion.aside
            key="cart-panel"
            ref={panelRef}
            data-testid="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reducedMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reducedMotion ? undefined : { x: '100%' }}
            transition={reducedMotion ? { duration: 0 } : SPRING}
            className="fixed inset-y-0 right-0 z-modal flex w-full max-w-[26rem] flex-col bg-card shadow-pop"
          >
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">
                Your cart
              </h2>
              <button
                ref={closeRef}
                type="button"
                data-testid="cart-close"
                onClick={close}
                aria-label="Close cart"
                className="grid size-10 place-items-center rounded-control border border-line-2 bg-surface text-ink transition duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
                <motion.div
                  aria-hidden="true"
                  animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
                  transition={
                    reducedMotion
                      ? undefined
                      : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                  }
                  className="grid size-20 place-items-center rounded-card-lg bg-surface-2"
                >
                  <Phone className="size-9 text-subtle" strokeWidth={1.5} />
                </motion.div>
                <div>
                  <p className="text-base font-semibold text-ink">Your cart is empty</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Every phone we list has been tested and graded. Pick one to hold it
                    while you decide.
                  </p>
                </div>
                <ButtonLink
                  to={MARKETPLACE_ROUTES.shop}
                  variant="primary"
                  size="md"
                  onClick={close}
                >
                  Browse phones
                  <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {items.map((item) => {
                        const listing = item.listing
                        const isRemoving = removingId === listing?.id

                        return (
                          <motion.li
                            key={listing?.id}
                            layout={false}
                            data-testid="cart-line"
                            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={reducedMotion ? undefined : { opacity: 0, x: 24 }}
                            transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
                            className="flex gap-3 border-b border-line pb-3 last:border-b-0"
                          >
                            <Link
                              to={productPath(listing)}
                              onClick={close}
                              tabIndex={-1}
                              aria-hidden="true"
                              className="shrink-0"
                            >
                              <DeviceThumb listing={listing} size="sm" />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Link
                                    to={productPath(listing)}
                                    onClick={close}
                                    className="block truncate text-[15px] font-semibold text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                  >
                                    {deviceModel(listing)}
                                  </Link>
                                  <p className="truncate text-[13px] text-muted">
                                    {deviceVariant(listing) || listing?.brand}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  data-testid="cart-remove"
                                  onClick={() => handleRemove(listing.id)}
                                  disabled={isRemoving || isMutating}
                                  aria-label={`Remove ${deviceModel(listing)} from cart`}
                                  className="grid size-9 shrink-0 place-items-center rounded-control text-muted transition duration-150 hover:bg-surface-2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                                >
                                  <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                                </button>
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                  {listing?.grade ? <ConditionBadge grade={listing.grade} size="sm" /> : null}

                                  {/*
                                    A disabled stepper pinned at 1.

                                    A ReFon listing is one specific physical
                                    device with its own reservation, so there is
                                    no second unit to step to — and no API that
                                    would accept the request. Rendering the
                                    control in its real shape, disabled, states
                                    that fact rather than omitting it.
                                  */}
                                  <div
                                    className="flex items-center rounded-control border border-line-2 bg-surface"
                                    role="group"
                                    aria-label={`Quantity for ${deviceModel(listing)}: 1`}
                                  >
                                    <span
                                      className="grid size-8 place-items-center text-subtle"
                                      aria-hidden="true"
                                    >
                                      <Minus className="size-3.5" strokeWidth={1.5} />
                                    </span>
                                    <span
                                      data-testid="cart-quantity"
                                      className="min-w-7 text-center text-sm font-semibold tabular-nums text-ink"
                                    >
                                      1
                                    </span>
                                    <span
                                      className="grid size-8 place-items-center text-subtle"
                                      aria-hidden="true"
                                    >
                                      <Plus className="size-3.5" strokeWidth={1.5} />
                                    </span>
                                  </div>
                                </div>

                                <PriceInline value={lineTotal(item)} />
                              </div>
                            </div>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                  </ul>
                </div>

                <footer className="border-t border-line px-5 py-4">
                  {subtotal < FREE_DELIVERY_THRESHOLD && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-[13px] text-muted">
                        <Truck className="size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                        <span>
                          {remaining > 0 ? (
                            <>
                              <PriceInline value={remaining} /> more for free delivery
                            </>
                          ) : null}
                        </span>
                      </div>
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-control bg-surface-2"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={FREE_DELIVERY_THRESHOLD}
                        aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)}
                        aria-label="Progress toward free delivery"
                      >
                        {/* scaleX, not width: a width transition re-runs layout
                            on every frame while the subtotal counts. */}
                        <motion.div
                          data-testid="cart-free-delivery-bar"
                          initial={false}
                          animate={{ scaleX: progress }}
                          transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                          style={{ transformOrigin: '0% 50%' }}
                          className="h-full w-full bg-accent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted">Subtotal</span>
                    <span data-testid="cart-subtotal" className="text-lg font-bold text-ink">
                      <AnimatedAmount value={subtotal} format={formatPeso} />
                    </span>
                  </div>

                  {!canCheckout && blocking.length > 0 && (
                    <p className="mt-2 text-[13px] leading-relaxed text-danger">
                      Remove the unavailable {blocking.length === 1 ? 'phone' : 'phones'} above
                      to continue.
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <ButtonLink
                      to={MARKETPLACE_ROUTES.checkout}
                      variant="brand"
                      size="lg"
                      fullWidth
                      disabled={!canCheckout || isMutating}
                      onClick={close}
                      data-testid="cart-checkout"
                    >
                      Checkout
                      <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    </ButtonLink>

                    <div className="flex gap-2">
                      <ButtonLink
                        to={MARKETPLACE_ROUTES.cart}
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={close}
                        data-testid="cart-view-cart"
                      >
                        <ShoppingBag className="size-4" strokeWidth={1.5} aria-hidden="true" />
                        View cart
                      </ButtonLink>
                      {/*
                        Bordered, not a ghost. As a `ghost` this sat next to a
                        bordered "View cart" with no background, no ring, and no
                        underline, so it read as a stray label rather than a
                        control.
                      */}
                      <Button
                        variant="quiet-danger"
                        size="md"
                        fullWidth
                        onClick={handleEmpty}
                        disabled={isMutating}
                        aria-label="Empty the cart"
                      >
                        Empty
                      </Button>
                    </div>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}