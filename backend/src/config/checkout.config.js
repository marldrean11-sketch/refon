/**
 * Checkout configuration.
 *
 * The single source of truth for anything that affects what a buyer pays or how
 * long they wait. Delivery fees and payment options appear on the checkout page,
 * in the order summary, and on the shipping policy page, so they live here once
 * rather than as magic numbers scattered across components.
 *
 * Fees are in PHP. The server reads prices from the database and applies these
 * fees itself; the frontend only ever renders what this file produces, so a
 * client cannot choose its own delivery cost.
 */

/**
 * Philippine delivery zones.
 *
 * Grouped by island group rather than by all seventeen regions, which matches how
 * the published shipping policy already describes delivery times. Keeping the two
 * consistent matters: a buyer who read "five to seven business days" must not be
 * quoted a fee that implies something else.
 */
export const DELIVERY_ZONES = Object.freeze([
  {
    id: 'metro_manila',
    label: 'Metro Manila',
    description: 'Metro Manila, Bulacan, Cavite, Laguna, Pampanga, Rizal, and Quezon City.',
    // Business-day estimate shown to the buyer.
    minDays: 2,
    maxDays: 3,
  },
  {
    id: 'rest_of_luzon',
    label: 'Rest of Luzon',
    description: 'Ilocos, Cagayan Valley, Central Luzon, Bicol, and the Cordillera region.',
    minDays: 3,
    maxDays: 5,
  },
  {
    id: 'visayas_mindanao',
    label: 'Visayas and Mindanao',
    description: 'Central Visayas, Western Visayas, Davao, Northern Mindanao, and SOCCSKSARGEN.',
    minDays: 5,
    maxDays: 7,
  },
])

/**
 * Delivery methods.
 *
 * Fees follow the published shipping policy. `zones` maps a delivery zone to the
 * fee for that method, so a single method can cost differently by destination
 * instead of presenting one flat national number that is wrong for most of the
 * country.
 *
 * `expressZones` is deliberately a short list: next-business-day delivery is only
 * claimed where the courier network can actually meet it. A method that is not
 * offered for the buyer's zone is not shown to them at all, rather than shown and
 * then refused.
 */
export const DELIVERY_METHODS = Object.freeze([
  {
    id: 'standard',
    label: 'Standard Delivery',
    description: 'Tracked delivery through our courier partner.',
    express: false,
    fees: { metro_manila: 79, rest_of_luzon: 129, visayas_mindanao: 169 },
  },
  {
    id: 'express',
    label: 'Express Delivery',
    description: 'Priority handling for buyers who need the phone sooner.',
    express: true,
    fees: { metro_manila: 199, rest_of_luzon: 299, visayas_mindanao: 349 },
    expressZones: ['metro_manila'],
  },
])

/** Order of zones and methods, used by the frontend to render a stable list. */
export const DEFAULT_ZONE_ID = 'metro_manila'

/**
 * Payment methods.
 *
 * Every one of these is a **demo** selection. No payment credentials are collected
 * for any of them, no gateway is contacted, and no money moves. `demo: true` is
 * returned to the client so the interface can say so plainly rather than implying
 * a live payment step exists.
 *
 * Cash on delivery is the only method with any real-world meaning in this build.
 */
export const PAYMENT_METHODS = Object.freeze([
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay the courier when the phone arrives.',
    instructions: 'Please have the exact amount ready for the courier.',
    demo: false,
    collectsCredentials: false,
  },
  {
    id: 'gcash',
    label: 'GCash',
    description: 'Demo payment method. No GCash account details are collected.',
    instructions: 'A ReFon support agent would send payment instructions after the order is placed.',
    demo: true,
    collectsCredentials: false,
  },
  {
    id: 'maya',
    label: 'Maya',
    description: 'Demo payment method. No Maya account details are collected.',
    instructions: 'A ReFon support agent would send payment instructions after the order is placed.',
    demo: true,
    collectsCredentials: false,
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Demo payment method. No bank login details are collected.',
    instructions: 'A ReFon support agent would send payment instructions after the order is placed.',
    demo: true,
    collectsCredentials: false,
  },
])

/** Payment methods are chosen by id; a request naming anything else is refused. */
export const PAYMENT_METHOD_IDS = PAYMENT_METHODS.map((method) => method.id)

/**
 * Free-delivery threshold, applied to standard delivery only.
 *
 * Phrased in the site's existing published terms ("free above ₱15,000") so the
 * checkout cannot quote a different policy from the shipping page.
 */
export const FREE_STANDARD_DELIVERY_THRESHOLD = 15000

function findDeliveryMethod(id) {
  return DELIVERY_METHODS.find((method) => method.id === id)
}

function findPaymentMethod(id) {
  return PAYMENT_METHODS.find((method) => method.id === id)
}

/**
 * The delivery fee for a method and destination zone.
 *
 * Returns null when the method does not serve that zone. Callers must handle null
 * by not offering the method rather than defaulting to zero, because a zero fee
 * for an unsupported destination would understate the real cost.
 *
 * `expressZones` is enforced here rather than only in the UI, because a next-day
 * promise that the courier network cannot meet outside Metro Manila has to be
 * refused by the server too — otherwise a caller could quote express to Davao by
 * asking directly.
 */
export function deliveryFeeFor(deliveryMethodId, zoneId) {
  const method = findDeliveryMethod(deliveryMethodId)

  if (!method) {
    return null
  }

  if (Array.isArray(method.expressZones) && !method.expressZones.includes(zoneId)) {
    return null
  }

  const fee = method.fees[zoneId]

  return Number.isFinite(fee) ? fee : null
}

/** True when the method can serve the destination at all. */
export function isDeliveryAvailableForZone(deliveryMethodId, zoneId) {
  return deliveryFeeFor(deliveryMethodId, zoneId) !== null
}

/**
 * Delivery options for a destination zone.
 *
 * `fee` is already resolved and already accounts for the free-delivery threshold,
 * so the checkout total and the option the buyer picked can never disagree.
 */
export function deliveryOptionsForZone(zoneId, subtotal) {
  return DELIVERY_METHODS.filter((method) => isDeliveryAvailableForZone(method.id, zoneId)).map(
    (method) => {
      const fee = deliveryFeeFor(method.id, zoneId)
      const qualifiesForFreeDelivery =
        !method.express && Number(subtotal) >= FREE_STANDARD_DELIVERY_THRESHOLD

      return {
        id: method.id,
        label: method.label,
        description: method.description,
        express: method.express,
        fee,
        originalFee: qualifiesForFreeDelivery ? fee : null,
        freeDelivery: qualifiesForFreeDelivery,
        effectiveFee: qualifiesForFreeDelivery ? 0 : fee,
        minDays: method.express
          ? 1
          : DELIVERY_ZONES.find((zone) => zone.id === zoneId)?.minDays ?? 3,
        maxDays: method.express
          ? 1
          : DELIVERY_ZONES.find((zone) => zone.id === zoneId)?.maxDays ?? 7,
      }
    },
  )
}

/**
 * The options payload the checkout page renders from.
 *
 * Shipping the catalogue from the server means the frontend holds no fee numbers
 * of its own, so a change here cannot leave stale figures in a component.
 */
export function presentCheckoutOptions({ zoneId = DEFAULT_ZONE_ID, subtotal = 0 } = {}) {
  const zone = DELIVERY_ZONES.find((entry) => entry.id === zoneId) ?? DELIVERY_ZONES[0]

  return {
    currency: 'PHP',
    defaultZoneId: zone.id,
    zones: DELIVERY_ZONES.map((entry) => ({
      id: entry.id,
      label: entry.label,
      description: entry.description,
    })),
    deliveryMethods: deliveryOptionsForZone(zone.id, subtotal),
    paymentMethods: PAYMENT_METHODS.map((method) => ({
      id: method.id,
      label: method.label,
      description: method.description,
      instructions: method.instructions,
      demo: method.demo,
    })),
    // Stated once so the UI can be explicit about it wherever payment is chosen,
    // rather than relying on each component to say the right thing.
    demoPaymentNotice:
      'This build takes a payment preference only. No payment is processed, and no payment or bank credentials are collected.',
    freeStandardDeliveryThreshold: FREE_STANDARD_DELIVERY_THRESHOLD,
  }
}

export { findDeliveryMethod, findPaymentMethod }
