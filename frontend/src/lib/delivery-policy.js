/**
 * Free standard delivery at or above this subtotal, in pesos.
 *
 * The backend owns this figure (`FREE_STANDARD_DELIVERY_THRESHOLD` in
 * `backend/src/config/checkout.config.js`) and the shipping page publishes the
 * same number, but the listing and cart endpoints do not send it. It is mirrored
 * here as a presentation-only constant, in one place, so a policy change has one
 * obvious frontend line to update.
 */
export const FREE_DELIVERY_THRESHOLD = 15000
