import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { PriceInline } from '../components/ui/PriceDisplay.jsx'
import { EmptyCartState, ErrorState } from '../components/ui/StateViews.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { updateProfileRequest } from '../features/account/account-api.js'
import { useCart } from '../features/cart/useCart.js'
import {
  blockingItems,
  changedPriceItems,
  isCartCheckoutable,
} from '../features/cart/cart-state.js'
import { cartErrorFields, cartErrorMessage } from '../features/cart/cart-errors.js'
import {
  getCheckoutOptionsRequest,
  getCheckoutQuoteRequest,
  placeOrderRequest,
} from '../features/checkout/checkout-api.js'
import {
  emptyCheckoutDetails,
  firstInvalidField,
  prefillFromUser,
  validateCheckoutForm,
} from '../features/checkout/checkout-validation.js'
import { CheckoutSection } from '../features/checkout/components/CheckoutSection.jsx'
import {
  AddressForm,
  CustomerDetailsForm,
} from '../features/checkout/components/CheckoutForms.jsx'
import {
  DeliveryMethodSelector,
  PaymentMethodSelector,
} from '../features/checkout/components/CheckoutSelectors.jsx'
import { OrderReview } from '../features/checkout/components/OrderReview.jsx'
import { CheckoutSkeleton } from '../features/checkout/components/CheckoutSkeleton.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

/**
 * Checkout.
 *
 * One page, four sections, in the order a buyer answers questions: who you are,
 * where it goes, how fast it gets there, how you would pay. The order review sits
 * below and the price summary alongside on desktop, so the decision and the
 * consequence are visible together.
 *
 * Two properties this page is built around:
 *
 *  1. **Nothing about money is decided here.** Subtotal comes from the cart, the
 *     delivery fee comes from the server's configured catalogue, and the total shown
 *     is the server's quote. The form never adds a peso the API has not agreed to.
 *
 *  2. **Submission cannot happen twice.** `isSubmitting` gates the button, the form
 *     is not a native submit, and the quote request is the only write. A double tap
 *     produces one request.
 *
 * Phase 6 has no order domain. `getCheckoutQuoteRequest` prices the checkout and
 * confirms it can proceed, then the buyer is taken to a confirmation screen that
 * says plainly that no order was placed and no payment was taken. Phase 7 replaces
 * that one call with an order write; the form, the review, and the price breakdown
 * above it do not change.
 */
/** `+63 917…`, `(917) 123-4567` and `0917…` all become `0917…`. */
function localMobile(value) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('63')) return `0${digits.slice(2)}`
  if (digits.startsWith('9')) return `0${digits}`
  return digits
}

export function CheckoutPage() {
  const { user, updateUser } = useAuth()
  const { cart, isLoading: isCartLoading, refresh } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  const [details, setDetails] = useState(() => emptyCheckoutDetails())
  const [deliveryMethodId, setDeliveryMethodId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const [options, setOptions] = useState(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState(null)

  const [quote, setQuote] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formRef = useRef(null)
  // Guards against a second submit landing while the first is still in flight, which
  // a disabled button alone does not cover for keyboard and programmatic submits.
  const submitInFlight = useRef(false)

  // Prefill from the account once, when the session resolves.
  const [hasPrefilled, setHasPrefilled] = useState(false)

  useEffect(() => {
    if (hasPrefilled) {
      return
    }

    if (user) {
      setDetails((current) => prefillFromUser(current, user))
      setHasPrefilled(true)
    }
  }, [hasPrefilled, user])

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true)
    setOptionsError(null)

    try {
      const response = await getCheckoutOptionsRequest()
      setOptions(response)

      // Default to the first offered method so a buyer who does not care is never
      // blocked by a choice they were not asked to make. Cash on delivery is first
      // in the configured order.
      setDeliveryMethodId((current) => current || response.deliveryMethods[0]?.id || '')
      setPaymentMethodId((current) => current || response.paymentMethods[0]?.id || '')

      return response
    } catch (error) {
      setOptionsError(error)
      return null
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  /** Places the order the buyer just reviewed, then shows the confirmation. */
  async function handlePlaceOrder() {
    if (submitInFlight.current) return
    submitInFlight.current = true
    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await placeOrderRequest({ deliveryMethodId, paymentMethodId, details })
      // A buyer's first order also saves their delivery details, so the next
      // checkout is already filled in. They can change them under Account.
      if (user && !user.defaultAddress) {
        updateProfileRequest({
          ...(!user.phone && details.mobile ? { phone: localMobile(details.mobile) } : {}),
          defaultAddress: {
            region: details.region ?? '',
            province: details.province ?? '',
            city: details.city ?? '',
            barangay: details.barangay ?? '',
            street: details.street ?? '',
            postalCode: details.postalCode ?? '',
            deliveryNotes: details.deliveryNotes ?? '',
          },
        })
          .then((profile) => updateUser(profile.user))
          .catch(() => {})
      }
      // The cart is empty now; refresh it so the header count drops.
      await refresh({ silent: true }).catch(() => {})
      navigate(MARKETPLACE_ROUTES.checkoutConfirmed, {
        replace: true,
        state: { quote, orders: response.orders },
      })
    } catch (error) {
      setFormError(cartErrorMessage(error))
      setQuote(null)
      await refresh({ silent: true }).catch(() => {})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      submitInFlight.current = false
      setIsSubmitting(false)
    }
  }

  const blocked = useMemo(() => blockingItems(cart.items), [cart.items])
  const priceChanges = useMemo(() => changedPriceItems(cart.items), [cart.items])
  const canCheckout = isCartCheckoutable(cart)

  function handleChange(field, value) {
    setDetails((current) => ({ ...current, [field]: value }))

    // Clear a field's error as soon as it is edited, so the shopper sees progress
    // rather than an error they have already fixed.
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /**
   * Focuses and scrolls to the first field that needs attention.
   *
   * Runs after the error state has been committed, otherwise the element the field
   * is scrolled to does not exist in the DOM yet.
   */
  function focusFirstError(nextErrors) {
    window.requestAnimationFrame(() => {
      const field = firstInvalidField(nextErrors)

      if (!field) {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      const element = formRef.current?.querySelector(`[name="${field}"]`)

      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus({ preventScroll: true })
      } else {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  async function handleSubmit() {
    if (submitInFlight.current || isSubmitting) {
      return
    }

    const validationErrors = validateCheckoutForm({ details, deliveryMethodId, paymentMethodId })

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setFormError(
        Object.keys(validationErrors).length === 1
          ? 'Please correct the highlighted field.'
          : 'Please correct the highlighted fields.',
      )
      focusFirstError(validationErrors)
      return
    }

    submitInFlight.current = true
    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await getCheckoutQuoteRequest({
        deliveryMethodId,
        paymentMethodId,
        details,
      })

      // The quote is the authority. The review renders it rather than the form's own
      // arithmetic, so what the buyer confirms is what the server computed.
      setQuote(response)

      toast.success('Your checkout details are ready to review.', {
        description: 'Review the summary below before confirming.',
      })

      window.requestAnimationFrame(() => {
        document
          .getElementById('order-review-heading')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (error) {
      // One helper owns the mapping from API error keys to form field names, so the
      // page does not have to know whether the validator or the service caught the
      // problem in order to highlight the right input.
      const fieldErrors = cartErrorFields(error)
      const hasFieldErrors = Object.keys(fieldErrors).length > 0
      setErrors(hasFieldErrors ? fieldErrors : {})

      const message = cartErrorMessage(error)

      // A cart that changed underneath the buyer is not a form problem. Say what
      // happened and offer to refresh, rather than highlighting empty fields.
      const isCartConflict =
        error?.code === 'CART_HAS_UNAVAILABLE_ITEMS' ||
        error?.code === 'CART_RESERVATION_EXPIRED' ||
        error?.code === 'CART_EMPTY'

      setFormError(message)

      if (isCartConflict) {
        await refresh({ silent: true }).catch(() => {})
      } else if (hasFieldErrors) {
        focusFirstError(fieldErrors)
      }
    } finally {
      submitInFlight.current = false
      setIsSubmitting(false)
    }
  }

  if (isCartLoading || isLoadingOptions) {
    return <CheckoutSkeleton />
  }

  // A cart that cannot be checked out never reaches a form. Sending someone to fill
  // in an address for a cart that cannot become an order would be wasted effort and
  // a worse experience than sending them back to the thing that is wrong.
  if (cart.items.length === 0 || !canCheckout) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
            Step 2 of 3
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Checkout
          </h1>
        </div>

        <div
          className="mx-auto mt-8 flex max-w-xl gap-3 rounded-card border border-amber-300 bg-amber-50 p-5"
          role="status"
          data-testid="checkout-guard"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-950">
              {cart.items.length === 0
                ? 'There is nothing to check out'
                : 'Your cart needs attention first'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              {cart.items.length === 0
                ? 'Your cart is empty, so there is no order to place.'
                : 'One or more devices are no longer available or their reservation expired. Remove them from your cart to continue.'}
            </p>
          </div>
        </div>

        <div className="mt-8">
          {cart.items.length === 0 ? (
            <EmptyCartState />
          ) : (
            <ul className="mx-auto max-w-xl space-y-2">
              {blocked.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-ink">
                    {item.listing?.brand} {item.listing?.model}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {item.availability === 'UNAVAILABLE'
                      ? 'No longer available'
                      : 'Your reservation expired'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" size="md" onClick={() => navigate(MARKETPLACE_ROUTES.cart)}>
            Back to your cart
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              refresh().catch(() => {})
            }}
          >
            Refresh my cart
          </Button>
        </div>
      </div>
    )
  }

  if (optionsError) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6">
        <ErrorState
          title="We could not load delivery options"
          description={cartErrorMessage(optionsError)}
          onRetry={loadOptions}
        />
      </div>
    )
  }

  const selectedDelivery = options?.deliveryMethods.find(
    (method) => method.id === deliveryMethodId,
  )

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
          Step 2 of 3
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Checkout
        </h1>
        <p className="mt-3 max-w-2xl leading-body text-muted">
          Tell us where to deliver your phone and how you would like to pay.
        </p>
      </header>

      {/* A price change between adding and checking out is the buyer's decision to
          make, so it is stated before the form rather than inside the review. */}
      {priceChanges.increased.length > 0 && (
        <div
          className="mt-8 rounded-card border border-amber-300 bg-amber-50 p-4 sm:p-5"
          role="status"
          data-testid="checkout-price-warning"
        >
          <p className="text-sm font-bold text-amber-950">Price updated</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            {priceChanges.increased.length === 1
              ? 'One phone now costs more than it did when you added it. You will be charged the current price.'
              : `${priceChanges.increased.length} phones now cost more than they did when you added them. You will be charged the current prices.`}
          </p>
        </div>
      )}

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
          className="min-w-0 space-y-5"
          data-testid="checkout-form"
        >
          <CheckoutSection
            step={1}
            headingId="checkout-contact-heading"
            title="Customer Information"
            description="The courier uses these details to arrange delivery."
          >
            <CustomerDetailsForm
              details={details}
              errors={errors}
              onChange={handleChange}
              isPrefilled={Boolean(user)}
            />
          </CheckoutSection>

          <CheckoutSection
            step={2}
            headingId="checkout-address-heading"
            title="Shipping Address"
            description="We deliver nationwide. Your region determines the delivery fee."
          >
            <AddressForm details={details} errors={errors} onChange={handleChange} />
          </CheckoutSection>

          <CheckoutSection
            step={3}
            headingId="checkout-delivery-heading"
            title="Delivery Method"
          >
            <DeliveryMethodSelector
              options={options?.deliveryMethods ?? []}
              value={deliveryMethodId}
              onChange={(value) => {
                setDeliveryMethodId(value)
                setErrors((current) => ({ ...current, deliveryMethodId: undefined }))
              }}
              error={errors.deliveryMethodId}
              loading={isLoadingOptions}
            />
          </CheckoutSection>

          <CheckoutSection
            step={4}
            headingId="checkout-payment-heading"
            title="Payment Method"
          >
            <PaymentMethodSelector
              methods={options?.paymentMethods ?? []}
              value={paymentMethodId}
              onChange={(value) => {
                setPaymentMethodId(value)
                setErrors((current) => ({ ...current, paymentMethodId: undefined }))
              }}
              error={errors.paymentMethodId}
              notice={options?.demoPaymentNotice}
            />
          </CheckoutSection>

          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate(MARKETPLACE_ROUTES.cart)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to cart
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
              data-testid="checkout-review-button"
            >
              {isSubmitting ? 'Reviewing your order…' : 'Review My Order'}
            </Button>
          </div>

          {/* The form-level failure lives with the form, not inside the review.
              A cart that changed underneath the shopper produces no review, so
              rendering this only alongside a review would swallow the message
              entirely and leave the button looking simply inert. */}
          {formError && (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
              role="alert"
              data-testid="checkout-error"
            >
              <p className="text-sm font-semibold text-danger">
                We could not review your order
              </p>
              <p className="mt-1 text-sm leading-relaxed text-danger">{formError}</p>
            </div>
          )}
        </form>

        {/* The summary rail. Sticky on desktop, stacked under the form on mobile. */}
        <div className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-card-lg border border-line bg-white shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Order Summary
              </h2>
              <p className="mt-1 text-xs text-muted">
                {cart.purchasableCount === 1
                  ? '1 device reserved'
                  : `${cart.purchasableCount} devices reserved`}
              </p>
            </div>

            <ul className="divide-y divide-line">
              {cart.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 px-5 py-3">
                  <span className="min-w-0 truncate text-xs text-muted">
                    {item.listing?.brand} {item.listing?.model}
                  </span>
                  <PriceInline value={item.currentPrice} className="text-sm" />
                </li>
              ))}
            </ul>

            <dl className="space-y-2.5 border-t border-line p-5 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd>
                  <PriceInline value={cart.subtotal} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Delivery</dt>
                <dd>
                  <PriceInline
                    value={selectedDelivery?.freeDelivery ? 0 : (selectedDelivery?.effectiveFee ?? 0)}
                  />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="font-display text-base font-bold text-ink">Estimated total</dt>
                <dd data-testid="checkout-estimated-total">
                  <PriceInline
                    value={Number(cart.subtotal) + Number(selectedDelivery?.effectiveFee ?? 0)}
                    className="text-xl"
                  />
                </dd>
              </div>
            </dl>

            <p className="border-t border-line bg-canvas px-5 py-3.5 text-xs leading-relaxed text-muted">
              This is an estimate. The exact total is confirmed by ReFon when you review
              your order.
            </p>
          </div>

          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent-600" aria-hidden="true" />
            ReFon never asks for your GCash, Maya, or bank login details.
          </p>
        </div>
      </div>

      {/* The review appears only after a successful server quote, so what is
          confirmed is always the server's own arithmetic. */}
      {quote && (
        <div className="mt-12" data-testid="checkout-review">
          <OrderReview
            items={quote.items}
            contact={quote.contact}
            delivery={quote.delivery}
            payment={quote.payment}
            subtotal={quote.quote.subtotal}
            deliveryFee={quote.quote.deliveryFee}
            freeDeliveryApplied={quote.quote.freeDeliveryApplied}
            deliveryFeeBeforeDiscount={quote.quote.deliveryFeeBeforeDiscount}
          />

          <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setQuote(null)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Back to my details
            </Button>

            <Button
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              data-testid="checkout-confirm-button"
            >
              Place order
            </Button>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted">
            Placing the order reserves these phones for you and notifies the seller. No
            payment is taken online: for GCash, Maya or bank, the seller&rsquo;s payment details
            appear on your order once they confirm it.
          </p>
        </div>
      )}
    </div>
  )
}
