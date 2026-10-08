import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ShoppingBag, TriangleAlert } from 'lucide-react'
import { useCart } from '../useCart.js'
import { cartErrorHeadline, cartErrorMessage } from '../cart-errors.js'
import { useToast } from '../../../components/ui/Toast.jsx'
import { useAuth } from '../../auth/useAuth.js'
import { rememberIntent } from '../pending-intent.js'
import { deviceName } from '../cart-state.js'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../../../lib/routes.js'

const SIZE_CLASSES = {
  sm: 'h-12 px-5 text-[13px]',
  md: 'h-14 px-7 text-sm',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-control font-mono font-semibold uppercase tracking-[0.1em] transition duration-150'

const IDLE_CLASSES =
  'bg-primary-950 text-white ring-1 ring-inset ring-primary-950 hover:bg-primary-800 active:bg-primary-900'

// "Already held" is a state, not a warning, so it inverts rather than turning
// green. A jade button beside an Obsidian one would read as a second offer.
const HELD_CLASSES =
  'bg-surface-2 text-ink ring-1 ring-inset ring-line-2 hover:bg-surface-3 hover:text-primary-950'

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
  const { addListing, containsListing, isMutating, isBuyer } = useCart()
  const toast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isAdding, setIsAdding] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [justAdded, setJustAdded] = useState(false)

  const inCart = containsListing(listing.id)
  const isBusy = isAdding || isMutating

  /**
   * Only a buyer holds a phone, so this control has three behaviours.
   *
   *  - **Buyer.** Adds the phone, exactly as before.
   *  - **Visitor.** Records the intent and goes to sign in. `PendingIntentReplay` adds
   *    the phone once the session resolves, which is also when the hold starts.
   *  - **Seller or admin.** Says so and stays put. Sending them to sign in would be
   *    pointless: they already have an account, and signing in again would make them
   *    the same seller.
   */
  function handleBuyerOnlyAction() {
    if (!user) {
      rememberIntent(listing.id, 'add-to-cart')
      toast.success('Sign in to reserve this phone.', {
        description: 'We will add it to your cart straight after.',
      })
      navigate(AUTH_ROUTES.login, {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }

    toast.error('Cart and wishlist are for buyer accounts.', {
      description: 'Your seller account cannot buy from this marketplace.',
    })
  }

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

    if (!isBuyer) {
      handleBuyerOnlyAction()
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
            className="mt-3 flex items-start gap-2 rounded-control border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger"
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
