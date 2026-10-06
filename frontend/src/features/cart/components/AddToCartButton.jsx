import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ShoppingBag, TriangleAlert } from 'lucide-react'
import { useCart } from '../useCart.js'
import { cartErrorHeadline, cartErrorMessage } from '../cart-errors.js'
import { useToast } from '../../../components/ui/Toast.jsx'
import { deviceName } from '../cart-state.js'
import { MARKETPLACE_ROUTES } from '../../../lib/routes.js'

const SIZE_CLASSES = {
  sm: 'h-12 px-5 text-[15px]',
  md: 'h-14 px-7 text-base',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition duration-200'

const IDLE_CLASSES =
  'bg-primary-500 text-white shadow-card hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover active:translate-y-0'

const HELD_CLASSES =
  'border border-accent-200 bg-accent-50 text-accent-800 shadow-sm hover:bg-accent-100'

/**
 * Add a listing to the cart and hold it.
 *
 * A ReFon listing is one specific physical device, so this reserves that device
 * rather than adding a quantity — there is nothing to step through.
 *
 * Two decisions worth stating:
 *
 *  - **Success does not navigate.** A buyer who was reading the condition report
 *    should get to finish. The button confirms in place and becomes a link to the
 *    cart, so the next step is one tap when they want it and not forced.
 *  - **Failure is shown inline, not only in a toast.** A reservation refusal is
 *    meaningful — somebody else is holding this phone — and a message that vanishes
 *    after four seconds is not enough to act on. The toast is a supplement.
 *
 * Once the device is held, the control becomes a link to the cart rather than a
 * disabled button, because "already in your cart" is a place to go, not a dead end.
 */
export function AddToCartButton({
  listing,
  size = 'md',
  fullWidth = false,
  className = '',
  placement = 'desktop',
  label = 'Add to Cart',
}) {
  const { addListing, containsListing, isMutating } = useCart()
  const toast = useToast()

  const [isAdding, setIsAdding] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [justAdded, setJustAdded] = useState(false)

  const inCart = containsListing(listing.id)
  const isBusy = isAdding || isMutating

  // The confirmation settles back to the steady "in cart" state rather than leaving a
  // stale success message on screen. In an effect, so it is one timer per
  // transition rather than one per render.
  useEffect(() => {
    if (!justAdded) {
      return undefined
    }

    const timer = window.setTimeout(() => setJustAdded(false), 4000)

    return () => window.clearTimeout(timer)
  }, [justAdded])

  async function handleAdd() {
    if (isBusy) {
      return
    }

    setIsAdding(true)
    setErrorMessage(null)

    try {
      const response = await addListing(listing.id)

      const item = response.cart.items.find((entry) => entry.listing?.id === listing.id)
      const seconds = Number(item?.reservation?.secondsRemaining ?? 0)

      setJustAdded(true)

      toast.success(`${deviceName(listing)} added to your cart.`, {
        description:
          seconds > 0
            ? `This device is held for ${Math.ceil(seconds / 60)} minutes while you check out.`
            : 'View your cart to check out.',
      })
    } catch (error) {
      const message = cartErrorMessage(error)

      setErrorMessage(message)
      toast.error(cartErrorHeadline(error), { description: message })
    } finally {
      setIsAdding(false)
    }
  }

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const widthClass = fullWidth ? 'w-full' : ''
  const toneClass = inCart || justAdded ? HELD_CLASSES : IDLE_CLASSES

  const content = isBusy ? (
    <>
      <span
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      Reserving…
    </>
  ) : inCart || justAdded ? (
    <>
      <Check className="size-5 shrink-0" aria-hidden="true" />
      {justAdded ? 'Added to cart' : 'In your cart'}
    </>
  ) : (
    <>
      <ShoppingBag className="size-5 shrink-0" aria-hidden="true" />
      {label}
    </>
  )

  const sharedProps = {
    className: `${BASE_CLASSES} ${toneClass} ${sizeClass} ${widthClass} ${className}`,
    'data-testid': 'add-to-cart',
    // The product page renders this action in two responsive slots — the desktop
    // purchase panel and the mobile bottom bar. Only one is displayed at a time
    // (`hidden lg:block` and `lg:hidden` respectively), so neither is in the tab
    // order twice; naming which is which lets a caller target the one it means
    // instead of relying on DOM order.
    'data-placement': placement,
    'data-listing-id': listing.id,
    'data-in-cart': inCart ? 'true' : 'false',
  }

  return (
    <div className={fullWidth ? 'w-full' : undefined}>
      {inCart && !isBusy ? (
        <Link
          to={MARKETPLACE_ROUTES.cart}
          {...sharedProps}
          aria-label={`${deviceName(listing)} is in your cart. Go to your cart.`}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          disabled={isBusy}
          aria-busy={isBusy}
          {...sharedProps}
        >
          {content}
        </button>
      )}

      {/* Held inline and announced assertively, so a reservation refusal stays on
          screen long enough to read and act on. */}
      <div aria-live="assertive" className="empty:hidden">
        {errorMessage && (
          <p
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
            data-testid="add-to-cart-error"
            role="alert"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
