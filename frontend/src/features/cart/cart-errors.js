import { ApiClientError } from '../../lib/api-client.js'

/**
 * Cart and checkout error messages.
 *
 * The API speaks in status codes because that is what is useful to a client
 * program. A shopper needs a sentence and, where it helps, something to do next.
 * Every message here is written as an instruction rather than a diagnosis: no
 * `409 LISTING_RESERVED`, no "validation error", no mention of the API at all.
 *
 * Anything without an entry falls back to a generic apology that still offers a
 * way forward, so an unforeseen code never renders as raw backend jargon.
 */

const CART_MESSAGES = Object.freeze({
  LISTING_RESERVED:
    'Another buyer is holding this phone right now. It may become available again shortly — you can remove it and keep browsing.',

  LISTING_NOT_AVAILABLE:
    'This phone is no longer available. Please remove it from your cart before continuing.',

  LISTING_UNAVAILABLE:
    'This phone is no longer available. Please remove it from your cart before continuing.',

  OWN_LISTING_NOT_PURCHASABLE:
    'You cannot buy your own listing. Remove it from your cart to continue.',

  CART_LIMIT_REACHED:
    'Your cart is full. Remove a phone before adding another one.',

  CART_EMPTY: 'Your cart is empty. Add a phone before checking out.',

  CART_UNAVAILABLE: 'We could not find your cart. Please refresh the page and try again.',

  CART_HAS_UNAVAILABLE_ITEMS:
    'Some phones in your cart are no longer available. Please remove them before continuing.',

  CART_RESERVATION_EXPIRED:
    'Your reservation expired for one or more phones. Please remove them to continue.',

  CHECKOUT_VALIDATION_ERROR: 'Please correct the highlighted fields.',

  SESSION_EXPIRED: 'Your session has expired. Please sign in again to continue.',

  AUTHENTICATION_REQUIRED: 'Please sign in to continue with your order.',

  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',

  NETWORK_ERROR:
    'We could not reach ReFon. Check your connection and try again — nothing has been charged.',

  VALIDATION_ERROR: 'Please check the details you entered and try again.',

  INTERNAL_ERROR:
    'Something went wrong on our side. Nothing has been charged — please try again.',
})

const GENERIC_MESSAGE =
  'We could not complete that request. Please try again — nothing has been charged.'

/** A shopper-facing sentence for an error, plus whether retrying could help. */
export function cartErrorMessage(error) {
  if (!(error instanceof ApiClientError)) {
    return GENERIC_MESSAGE
  }

  if (CART_MESSAGES[error.code]) {
    return CART_MESSAGES[error.code]
  }

  if (error.status >= 500) {
    return CART_MESSAGES.INTERNAL_ERROR
  }

  return error.message || GENERIC_MESSAGE
}

/**
 * Per-field messages from a 422 response.
 *
 * Checkout validates a nested `details` block, so its keys arrive prefixed
 * (`details.mobile`). They are unprefixed here so a form field can look up its own
 * message by name without knowing where it sits in the request body.
 */
export function cartErrorFields(error) {
  if (!(error instanceof ApiClientError) || !error.errors) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(error.errors)
      .filter(([key]) => typeof key === 'string')
      .map(([key, message]) => [key.replace(/^details\./, ''), message]),
  )
}

/**
 * A short toast-friendly label for an error, which has far less room than a
 * paragraph inside a form.
 */
export function cartErrorHeadline(error) {
  const message = cartErrorMessage(error)

  // First sentence, trimmed to a length a toast can hold comfortably.
  const sentence = message.split('.')[0]

  return sentence.length > 70 ? `${sentence.slice(0, 67).trimEnd()}…` : sentence
}
