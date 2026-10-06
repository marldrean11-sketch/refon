/**
 * Checkout form validation.
 *
 * Runs in the browser as the shopper types, so it must mirror the server's rules
 * exactly — otherwise the form would accept something the API refuses, or reject
 * something it allows. The backend remains the authority; this exists to avoid
 * making someone discover a problem only after pressing the button.
 *
 * Messages are written as instructions for a shopper, never as diagnostics about a
 * schema or a request.
 */

/**
 * Philippine mobile numbers.
 *
 * Accepts the forms a person actually types — `0917 123 4567`, `+63 917 123 4567`,
 * `(917) 123-4567` — and requires a real mobile prefix, so a landline or a typo in
 * the middle digits is caught before it reaches the courier.
 */
const MOBILE_PATTERN = /^(?:\+?63|0)9\d{9}$/

function stripNonDigits(value) {
  return String(value ?? '').replace(/[\s()\-.]/g, '')
}

/** Field order, used to focus and scroll to the first problem. */
export const CHECKOUT_FIELD_ORDER = [
  'fullName',
  'email',
  'mobile',
  'region',
  'province',
  'city',
  'barangay',
  'street',
  'postalCode',
]

/** An empty form, used as the initial state and as the reset shape. */
export function emptyCheckoutDetails() {
  return {
    fullName: '',
    email: '',
    mobile: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    street: '',
    postalCode: '',
    deliveryNotes: '',
  }
}

/**
 * Prefills what an account already knows.
 *
 * Name and email come from the session so a signed-in buyer does not retype them.
 * Address fields are left empty because the account does not store an address in
 * this build, and inventing one would be worse than asking.
 */
export function prefillFromUser(details, user) {
  if (!user) {
    return details
  }

  return {
    ...details,
    fullName: details.fullName || user.name || '',
    email: details.email || user.email || '',
  }
}

/**
 * Validates the whole form.
 *
 * Returns a map of field name to message, empty when the form is valid. Keys match
 * the field names so a caller can look up its own message without mapping.
 */
export function validateCheckoutDetails(details) {
  const errors = {}

  const fullName = String(details.fullName ?? '').trim()
  const email = String(details.email ?? '').trim()
  const mobile = stripNonDigits(details.mobile)
  const region = String(details.region ?? '').trim()
  const province = String(details.province ?? '').trim()
  const city = String(details.city ?? '').trim()
  const barangay = String(details.barangay ?? '').trim()
  const street = String(details.street ?? '').trim()
  const postalCode = String(details.postalCode ?? '').trim()
  const deliveryNotes = String(details.deliveryNotes ?? '').trim()

  if (!fullName) {
    errors.fullName = 'Your full name is required.'
  } else if (fullName.length < 2) {
    errors.fullName = 'Enter at least 2 characters.'
  } else if (fullName.length > 120) {
    errors.fullName = 'Your name must be 120 characters or fewer.'
  }

  if (!email) {
    errors.email = 'Your email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    errors.email = 'Enter a valid email address.'
  }

  if (!mobile) {
    errors.mobile = 'Your mobile number is required.'
  } else if (!MOBILE_PATTERN.test(mobile)) {
    errors.mobile = 'Enter a valid Philippine mobile number, like 0917 123 4567.'
  }

  if (!region) {
    errors.region = 'Select a delivery region.'
  }

  if (!province) {
    errors.province = 'Your province is required.'
  }

  if (!city) {
    errors.city = 'Your city or municipality is required.'
  }

  if (!barangay) {
    errors.barangay = 'Your barangay is required.'
  }

  if (!street) {
    errors.street = 'Your house number, street, and building or unit are required.'
  } else if (street.length < 5) {
    errors.street = 'Enter your full street address.'
  }

  if (!postalCode) {
    errors.postalCode = 'Your postal code is required.'
  } else if (!/^\d{4}$/.test(postalCode)) {
    errors.postalCode = 'Enter a 4-digit Philippine postal code.'
  }

  if (deliveryNotes.length > 240) {
    errors.deliveryNotes = 'Delivery notes must be 240 characters or fewer.'
  }

  return errors
}

/** Validates the two required choices. */
export function validateSelections({ deliveryMethodId, paymentMethodId }) {
  const errors = {}

  if (!deliveryMethodId) {
    errors.deliveryMethodId = 'Choose a delivery method.'
  }

  if (!paymentMethodId) {
    errors.paymentMethodId = 'Choose a payment method.'
  }

  return errors
}

/** Everything that must hold before checkout can be submitted. */
export function validateCheckoutForm({ details, deliveryMethodId, paymentMethodId }) {
  return {
    ...validateCheckoutDetails(details),
    ...validateSelections({ deliveryMethodId, paymentMethodId }),
  }
}

/**
 * The first field that needs attention, in form order.
 *
 * Used to scroll to and focus the earliest problem, so a shopper with several
 * mistakes is taken to the first one rather than the last.
 */
export function firstInvalidField(errors) {
  return CHECKOUT_FIELD_ORDER.find((field) => Boolean(errors[field])) ?? null
}

/** A delivery estimate as a sentence, e.g. "2–3 business days". */
export function deliveryEstimate(minDays, maxDays) {
  if (!Number.isFinite(minDays) || !Number.isFinite(maxDays)) {
    return ''
  }

  if (minDays === maxDays) {
    return `${minDays === 1 ? 'Next business day' : `${minDays} business days`}`
  }

  return `${minDays}–${maxDays} business days`
}
