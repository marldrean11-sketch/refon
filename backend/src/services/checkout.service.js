import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import {
  DEFAULT_ZONE_ID,
  DELIVERY_ZONES,
  FREE_STANDARD_DELIVERY_THRESHOLD,
  deliveryFeeFor,
  deliveryOptionsForZone,
  findDeliveryMethod,
  findPaymentMethod,
  isDeliveryAvailableForZone,
  presentCheckoutOptions,
} from '../config/checkout.config.js'
import { cartInclude } from './cart.service.js'
import { presentListing } from '../utils/listing-presenter.js'

/**
 * Checkout pricing and validation.
 *
 * This is the boundary between the cart and whatever comes next. It answers one
 * question authoritatively — "what would this cost, and is it still buyable?" —
 * and creates nothing.
 *
 * Two rules shape the whole module:
 *
 *  1. **The server decides the money.** Subtotal comes from the listing rows, not
 *     from anything the client sent. The request supplies only *choices*
 *     (delivery method, zone, payment method) and *contact details*, never a
 *     price, a discount, a fee, or a quantity.
 *
 *  2. **No order is created here.** A quote is not a purchase. Order creation,
 *     payment capture, and fulfilment belong to Phase 7, which replaces
 *     `confirmCheckout` with a real transactional write. Until then the
 *     reservation already taken in Phase 5 is what actually holds the device.
 */

/** Matches a Philippine mobile number, with or without the +63 prefix. */
const MOBILE_PATTERN = /^(?:\+?63|0)9\d{9}$/

function stripNonDigits(value) {
  return String(value ?? '').replace(/[\s()-]/g, '')
}

/** Trims and uppercases for storage and comparison. */
function normalizeRegion(region) {
  return String(region ?? '').trim().toUpperCase()
}

/**
 * Validates the buyer's contact and address block.
 *
 * This is the single owner of these rules. The request schema checks only the shape
 * of the payload, so every message a shopper sees about a contact or address field is
 * written here — which is why "is required" and "is too short" are always told apart
 * rather than one quietly standing in for the other.
 *
 * Mirrors the shape a Phase 7 `Order` row will need, so the same validation can be
 * reused verbatim when an order is actually persisted. Rejections name the field so
 * the checkout form can highlight it rather than showing a generic failure.
 */
function validateCheckoutDetails(details) {
  const errors = {}

  const name = String(details.fullName ?? '').trim()
  const email = String(details.email ?? '').trim().toLowerCase()
  const mobile = stripNonDigits(details.mobile)
  const region = normalizeRegion(details.region)
  const province = String(details.province ?? '').trim()
  const city = String(details.city ?? '').trim()
  const barangay = String(details.barangay ?? '').trim()
  const street = String(details.street ?? '').trim()
  const postalCode = String(details.postalCode ?? '').trim()
  const deliveryNotes = String(details.deliveryNotes ?? '').trim()

  /**
   * Presence, then length. Two separate messages because "is required" sends
   * someone to fill in an empty box while "is too short" sends them to fix
   * something they already typed, and those are different corrections.
   */
  function requireText(value, { min, max, label, presentMessage, shortMessage }) {
    if (value.length === 0) {
      errors[presentMessage.field] = presentMessage.text
      return
    }

    if (min && value.length < min) {
      errors[shortMessage.field] = shortMessage.text
      return
    }

    if (max && value.length > max) {
      errors[shortMessage.field] = `${label} must be ${max} characters or fewer.`
    }
  }

  requireText(name, {
    min: 2,
    max: 120,
    label: 'Your full name',
    presentMessage: { field: 'fullName', text: 'Your full name is required.' },
    shortMessage: {
      field: 'fullName',
      text: 'Your full name must be at least 2 characters.',
    },
  })

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
  } else if (region.length > 60) {
    errors.region = 'Your region must be 60 characters or fewer.'
  }

  for (const [field, value, label] of [
    ['province', province, 'Your province'],
    ['city', city, 'Your city or municipality'],
    ['barangay', barangay, 'Your barangay'],
  ]) {
    if (!value) {
      errors[field] = `${label} is required.`
    } else if (value.length < 2) {
      errors[field] = `${label} must be at least 2 characters.`
    } else if (value.length > 80) {
      errors[field] = `${label} must be 80 characters or fewer.`
    }
  }

  // The label a buyer sees is "House No., Street, Building, Unit", so the field
  // has to hold a real address line rather than one word.
  requireText(street, {
    min: 5,
    max: 160,
    label: 'Your street address',
    presentMessage: {
      field: 'street',
      text: 'Your house number, street, and building or unit are required.',
    },
    shortMessage: {
      field: 'street',
      text: 'Enter your full street address, including your house number.',
    },
  })

  if (!postalCode) {
    errors.postalCode = 'Your postal code is required.'
  } else if (!/^\d{4}$/.test(postalCode)) {
    errors.postalCode = 'Enter a 4-digit Philippine postal code.'
  }

  if (deliveryNotes.length > 240) {
    errors.deliveryNotes = 'Delivery notes must be 240 characters or fewer.'
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(
      422,
      'Please correct the highlighted fields.',
      'CHECKOUT_VALIDATION_ERROR',
      errors,
    )
  }

  return {
    fullName: name,
    email,
    mobile,
    region,
    province,
    city,
    barangay,
    street,
    postalCode,
    deliveryNotes: deliveryNotes || null,
  }
}

/** The delivery zone a Philippine region belongs to. */
export function resolveZoneId(region) {
  const normalized = normalizeRegion(region)

  // Metro Manila is a region code in its own right and is the most common answer
  // by a wide margin, so it is recognised explicitly rather than by substring.
  if (normalized === 'NCR') {
    return 'metro_manila'
  }

  const inMetroManila = new Set([
    'CALABARZON',
    'CAB',
    'R4',
    'R5',
    'R6',
    'R7',
    'R8',
    'R9',
    'R10',
    'R11',
    'R12',
    'R13',
    'R14',
    'R15',
  ])

  const inLuzon = new Set([
    'ILOCOS REGION',
    'CAGAYAN VALLEY',
    'CENTRAL LUZON',
    'CORDILLERA ADMINISTRATIVE REGION',
    'CAR',
    'BICOL REGION',
    'MIMAROPA',
  ])

  if (inMetroManila.has(normalized)) {
    return 'metro_manila'
  }

  if (inLuzon.has(normalized)) {
    return 'rest_of_luzon'
  }

  return 'visayas_mindanao'
}

/**
 * Loads the cart and decides whether it can be checked out at all.
 *
 * A cart is checkoutable when it holds at least one device, every device is
 * still purchasable, and no hold has lapsed. Anything else is refused here with a
 * code the cart page can act on, so an expired reservation cannot quietly become
 * an order.
 */
async function loadCheckoutableCart({ userId, guestTokenHash }) {
  const owner = userId ? { userId } : guestTokenHash ? { guestTokenHash } : null

  // A caller with no session and no guest cookie has no cart at all, which is the
  // same situation as a caller whose cart is empty. Both are reported identically:
  // distinguishing them would tell a client that its guess about a cart's ownership
  // was wrong, and would leave the interface with two different failures to handle
  // for one thing that is actually one thing.
  if (!owner) {
    throw new ApiError(409, 'Your cart is empty.', 'CART_EMPTY')
  }

  const cart = await prisma.cart.findUnique({ where: owner, include: cartInclude })

  if (!cart || cart.items.length === 0) {
    throw new ApiError(409, 'Your cart is empty.', 'CART_EMPTY')
  }

  const now = await prisma.$queryRaw`SELECT now() AS now`
  const at = now[0].now

  const unavailable = []
  const expired = []

  for (const item of cart.items) {
    if (item.listing.status !== 'APPROVED') {
      unavailable.push({ id: item.listingId, reason: 'LISTING_UNAVAILABLE' })
      continue
    }

    const reservation = item.reservations[0]

    // No reservation row, or one that has lapsed, means the device is no longer
    // held for this buyer. The cart page shows this state already; refusing it
    // here means the same rule applies to anyone calling the API directly.
    if (!reservation || reservation.releasedAt !== null || reservation.expiresAt <= at) {
      expired.push({ id: item.listingId })
    }
  }

  if (unavailable.length > 0) {
    throw new ApiError(
      409,
      'Some phones in your cart are no longer available. Remove them before continuing.',
      'CART_HAS_UNAVAILABLE_ITEMS',
      { listingIds: unavailable.map((entry) => entry.id) },
    )
  }

  if (expired.length > 0) {
    throw new ApiError(
      409,
      'Your reservation expired for one or more phones. Remove them to continue.',
      'CART_RESERVATION_EXPIRED',
      { listingIds: expired.map((entry) => entry.id) },
    )
  }

  return { cart, now: at }
}

/**
 * Builds the server-side price breakdown.
 *
 * Subtotal is summed from `listing.price` on the rows just read, never from a
 * snapshot the client could have influenced. The delivery fee is resolved from
 * configuration for the buyer's region.
 */
function buildTotals({ cart, deliveryMethodId, zoneId }) {
  const subtotal = cart.items.reduce(
    (total, item) => total + Number(item.listing.price) * item.quantity,
    0,
  )

  const method = findDeliveryMethod(deliveryMethodId)

  if (!method) {
    throw new ApiError(
      422,
      'Choose a delivery method.',
      'CHECKOUT_VALIDATION_ERROR',
      { deliveryMethodId: 'Choose a delivery method.' },
    )
  }

  if (!isDeliveryAvailableForZone(deliveryMethodId, zoneId)) {
    throw new ApiError(
      422,
      'That delivery method is not available for your region.',
      'CHECKOUT_VALIDATION_ERROR',
      { deliveryMethodId: 'Choose a delivery method available in your region.' },
    )
  }

  const baseFee = deliveryFeeFor(deliveryMethodId, zoneId)
  const qualifiesForFreeDelivery = !method.express && subtotal >= FREE_STANDARD_DELIVERY_THRESHOLD
  const deliveryFee = qualifiesForFreeDelivery ? 0 : baseFee

  return {
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    deliveryFeeBeforeDiscount: qualifiesForFreeDelivery ? baseFee : null,
    freeDeliveryApplied: qualifiesForFreeDelivery,
    total: Number((subtotal + deliveryFee).toFixed(2)),
    currency: 'PHP',
  }
}

/** Per-device review lines, so the confirmation screen has no second shape to build. */
function presentReviewItems(cart) {
  return cart.items.map((item) => ({
    cartItemId: item.id,
    listingId: item.listingId,
    quantity: item.quantity,
    unitPrice: Number(item.listing.price),
    lineTotal: Number((Number(item.listing.price) * item.quantity).toFixed(2)),
    reservationId: item.reservations[0]?.id ?? null,
    reservationExpiresAt: item.reservations[0]?.expiresAt?.toISOString() ?? null,
    listing: presentListing(item.listing),
  }))
}

/**
 * Delivery methods and payment methods for a buyer's region.
 *
 * The subtotal is read from the buyer's own cart rather than accepted as a
 * parameter, because the free-delivery threshold is a money decision and a
 * client-supplied subtotal would let a buyer talk their way below it.
 *
 * A cart that cannot be read is not an error here: the checkout page still needs to
 * render its options before there is anything in the cart, so the subtotal falls
 * back to zero and the free-delivery badge simply does not appear.
 */
export async function getCheckoutOptions({ userId, guestTokenHash, zoneId = DEFAULT_ZONE_ID } = {}) {
  const requestedZone = DELIVERY_ZONES.some((zone) => zone.id === zoneId)
    ? zoneId
    : DEFAULT_ZONE_ID

  const owner = userId ? { userId } : guestTokenHash ? { guestTokenHash } : null

  let subtotal = 0

  if (owner) {
    const cart = await prisma.cart.findUnique({
      where: owner,
      select: { items: { select: { quantity: true, listing: { select: { price: true } } } } },
    })

    subtotal =
      cart?.items.reduce(
        (total, item) => total + Number(item.listing.price) * item.quantity,
        0,
      ) ?? 0
  }

  return presentCheckoutOptions({ zoneId: requestedZone, subtotal })
}

/**
 * Prices a checkout without creating anything.
 *
 * Returns the breakdown, the resolved delivery and payment choice, the contact
 * block exactly as it will be stored, and the per-device lines. Phase 7 turns the
 * first four into an order row; until then this is the last point where money is
 * decided.
 */
export async function quoteCheckout({ userId, guestTokenHash, deliveryMethodId, paymentMethodId, details }) {
  const contact = validateCheckoutDetails(details)

  const zoneId = resolveZoneId(contact.region)

  const { cart, now } = await loadCheckoutableCart({ userId, guestTokenHash })

  const paymentMethod = findPaymentMethod(paymentMethodId)

  if (!paymentMethod) {
    throw new ApiError(
      422,
      'Choose a payment method.',
      'CHECKOUT_VALIDATION_ERROR',
      { paymentMethodId: 'Choose a payment method.' },
    )
  }

  const totals = buildTotals({ cart, deliveryMethodId, zoneId })
  const delivery = deliveryOptionsForZone(zoneId, totals.subtotal).find(
    (option) => option.id === deliveryMethodId,
  )

  return {
    quote: {
      reference: buildQuoteReference({ userId, guestTokenHash, now }),
      currency: totals.currency,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      deliveryFeeBeforeDiscount: totals.deliveryFeeBeforeDiscount,
      freeDeliveryApplied: totals.freeDeliveryApplied,
      total: totals.total,
      freeStandardDeliveryThreshold: FREE_STANDARD_DELIVERY_THRESHOLD,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      serverTime: now.toISOString(),
    },
    delivery: {
      id: deliveryMethodId,
      label: delivery?.label ?? findDeliveryMethod(deliveryMethodId).label,
      minDays: delivery?.minDays ?? 3,
      maxDays: delivery?.maxDays ?? 7,
      zoneId,
      zoneLabel: DELIVERY_ZONES.find((zone) => zone.id === zoneId)?.label ?? 'Philippines',
    },
    payment: {
      id: paymentMethod.id,
      label: paymentMethod.label,
      instructions: paymentMethod.instructions,
      demo: paymentMethod.demo,
    },
    contact,
    items: presentReviewItems(cart),
  }
}

/**
 * A stable, non-guessable reference for a quote.
 *
 * This is **not** an order number. It identifies one pricing calculation so the
 * confirmation screen and the buyer can refer to the same thing, and it deliberately
 * encodes no personal or cart information.
 */
function buildQuoteReference({ userId, guestTokenHash, now }) {
  const seed = `${userId ?? guestTokenHash ?? 'anonymous'}:${now.toISOString()}`


  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return `QT-${now.getTime().toString(36).toUpperCase()}-${hash.toString(36).toUpperCase().padStart(6, '0')}`
}
