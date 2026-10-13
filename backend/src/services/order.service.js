import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { quoteCheckout } from './checkout.service.js'
import { reviewedListingIds } from './review.service.js'
import {
  databaseNow,
  findActiveReservation,
  lockListing,
  releaseReservationForCartItem,
} from './reservation.service.js'

/**
 * Orders.
 *
 * Placing an order turns the buyer's checked-out cart into one order per seller,
 * in a single transaction: every phone is locked, its hold re-checked, its stock
 * taken (a one-off phone becomes SOLD), the holds released and the cart emptied.
 * The money comes from `quoteCheckout`, the same server-side pricing the review
 * screen showed, never from the client.
 *
 * Status moves forward only: PLACED → CONFIRMED → SHIPPED → COMPLETED, with
 * CANCELLED possible until the phone ships. Cancelling puts the stock back.
 */

const STATUS_FLOW = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

const STATUS_TIMESTAMP = {
  CONFIRMED: 'confirmedAt',
  SHIPPED: 'shippedAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
}

const STATUS_MESSAGE = {
  CONFIRMED: 'was confirmed by the seller',
  SHIPPED: 'is on its way',
  COMPLETED: 'was completed',
  CANCELLED: 'was cancelled',
}

const MAX_ORDERS = 200

const orderInclude = {
  items: true,
  seller: { select: { id: true, businessName: true, contactInfo: true } },
  buyer: { select: { id: true, name: true, email: true } },
}

/** RF-<date>-<random>, e.g. RF-261013-7KQ2M9. Readable over the phone, not guessable. */
function newReference(prefix) {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = crypto.randomBytes(5).readUIntBE(0, 5).toString(36).toUpperCase().padStart(8, '0').slice(-6)
  return `${prefix}-${date}-${random}`
}

function presentOrder(order, { forSeller = false, reviewed = null } = {}) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    checkoutReference: order.checkoutReference,
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    currency: 'PHP',
    delivery: { id: order.deliveryMethodId, label: order.deliveryLabel },
    payment: { id: order.paymentMethodId, label: order.paymentLabel },
    contact: order.contact,
    cancelReason: order.cancelReason ?? null,
    createdAt: order.createdAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    nextStatuses: STATUS_FLOW[order.status] ?? [],
    seller: order.seller
      ? {
          id: order.seller.id,
          businessName: order.seller.businessName,
          // The seller's contact is shared with their own buyer once an order exists.
          contactInfo: order.seller.contactInfo,
        }
      : null,
    buyer: forSeller && order.buyer ? { name: order.buyer.name, email: order.buyer.email } : undefined,
    items: order.items.map((item) => ({
      id: item.id,
      listingId: item.listingId,
      brand: item.brand,
      model: item.model,
      storage: item.storage,
      color: item.color,
      photo: item.photo,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number((Number(item.unitPrice) * item.quantity).toFixed(2)),
      // Buyer view only: whether this buyer has reviewed the phone.
      ...(reviewed ? { reviewed: Boolean(item.listingId && reviewed.has(item.listingId)) } : {}),
    })),
  }
}

/** Splits a delivery fee across orders in whole centavos; the first takes the remainder. */
function splitFee(fee, count) {
  const cents = Math.round(fee * 100)
  const share = Math.floor(cents / count)
  return Array.from({ length: count }, (_, index) =>
    (index === 0 ? cents - share * (count - 1) : share) / 100,
  )
}

export async function placeOrder({ userId, deliveryMethodId, paymentMethodId, details }) {
  // Validates the contact block, the cart, every hold and the delivery choice, and
  // prices everything server-side. Throws the same field errors the review screen uses.
  const quote = await quoteCheckout({ userId, deliveryMethodId, paymentMethodId, details })

  const orders = await prisma.$transaction(
    async (transaction) => {
      const now = await databaseNow(transaction)
      const listingIds = [...new Set(quote.items.map((item) => item.listingId))].sort()

      // Locked in a fixed order so two checkouts can never deadlock on each other.
      for (const listingId of listingIds) {
        await lockListing(transaction, listingId)
      }

      const listings = await transaction.listing.findMany({
        where: { id: { in: listingIds } },
        select: {
          id: true,
          sellerId: true,
          status: true,
          quantity: true,
          brand: true,
          model: true,
          storage: true,
          color: true,
          photos: true,
          price: true,
        },
      })
      const byId = new Map(listings.map((listing) => [listing.id, listing]))

      for (const item of quote.items) {
        const listing = byId.get(item.listingId)
        const hold = await findActiveReservation(transaction, item.listingId, now)

        if (!listing || listing.status !== 'APPROVED' || listing.quantity < item.quantity) {
          throw new ApiError(
            409,
            'A phone in your cart was just sold or removed. Review your cart and try again.',
            'CART_HAS_UNAVAILABLE_ITEMS',
            { listingIds: [item.listingId] },
          )
        }

        if (!hold || hold.cartItemId !== item.cartItemId) {
          throw new ApiError(
            409,
            'Your reservation expired for one or more phones. Review your cart to continue.',
            'CART_RESERVATION_EXPIRED',
            { listingIds: [item.listingId] },
          )
        }

        // A price change since the quote means the buyer has not agreed to this price.
        if (Number(listing.price) !== item.unitPrice) {
          throw new ApiError(
            409,
            'A price changed while you were checking out. Review your cart and try again.',
            'CART_PRICE_CHANGED',
            { listingIds: [item.listingId] },
          )
        }
      }

      // One order per seller.
      const groups = new Map()
      for (const item of quote.items) {
        const sellerId = byId.get(item.listingId).sellerId
        if (!groups.has(sellerId)) groups.set(sellerId, [])
        groups.get(sellerId).push(item)
      }

      const checkoutReference = newReference('CO')
      const fees = splitFee(quote.quote.deliveryFee, groups.size)
      const created = []
      let index = 0

      for (const [sellerId, items] of groups) {
        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
        const deliveryFee = fees[index]
        index += 1

        const order = await transaction.order.create({
          data: {
            orderNumber: newReference('RF'),
            checkoutReference,
            buyerId: userId,
            sellerId,
            subtotal: subtotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            total: (subtotal + deliveryFee).toFixed(2),
            deliveryMethodId: quote.delivery.id,
            deliveryLabel: quote.delivery.label,
            paymentMethodId: quote.payment.id,
            paymentLabel: quote.payment.label,
            contact: quote.contact,
            items: {
              create: items.map((item) => {
                const listing = byId.get(item.listingId)
                return {
                  listingId: listing.id,
                  brand: listing.brand,
                  model: listing.model,
                  storage: listing.storage,
                  color: listing.color,
                  photo: listing.photos[0] ?? null,
                  unitPrice: item.unitPrice.toFixed(2),
                  quantity: item.quantity,
                }
              }),
            },
          },
          include: orderInclude,
        })
        created.push(order)

        for (const item of items) {
          const listing = byId.get(item.listingId)
          const remaining = listing.quantity - item.quantity
          await transaction.listing.update({
            where: { id: listing.id },
            data: { quantity: Math.max(0, remaining), ...(remaining <= 0 ? { status: 'SOLD' } : {}) },
          })
          await releaseReservationForCartItem(transaction, item.cartItemId, now)
        }

        const sellerUser = await transaction.seller.findUnique({
          where: { id: sellerId },
          select: { userId: true },
        })
        const first = byId.get(items[0].listingId)
        await transaction.notification.create({
          data: {
            userId: sellerUser.userId,
            type: 'ORDER_PLACED',
            message: `New order ${order.orderNumber}: ${
              items.length === 1 ? `${first.brand} ${first.model}` : `${items.length} phones`
            }.`,
            relatedListingId: first.id,
          },
        })
      }

      await transaction.cartItem.deleteMany({
        where: { id: { in: quote.items.map((item) => item.cartItemId) } },
      })

      await transaction.notification.create({
        data: {
          userId,
          type: 'ORDER_PLACED',
          message:
            created.length === 1
              ? `Order ${created[0].orderNumber} was placed.`
              : `${created.length} orders were placed (${checkoutReference}).`,
          relatedListingId: quote.items[0].listingId,
        },
      })

      return created
    },
    { timeout: 20_000 },
  )

  return { orders: orders.map((order) => presentOrder(order)) }
}

export async function getBuyerOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_ORDERS,
    include: orderInclude,
  })
  const reviewed = await reviewedListingIds(
    userId,
    orders.flatMap((order) => order.items.map((item) => item.listingId).filter(Boolean)),
  )
  return { orders: orders.map((order) => presentOrder(order, { reviewed })) }
}

export async function getBuyerOrder(userId, orderNumber) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, buyerId: userId },
    include: orderInclude,
  })
  if (!order) {
    throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND')
  }
  const reviewed = await reviewedListingIds(
    userId,
    order.items.map((item) => item.listingId).filter(Boolean),
  )
  return presentOrder(order, { reviewed })
}

export async function getSellerOrders(userId, { status } = {}) {
  const orders = await prisma.order.findMany({
    where: { seller: { userId }, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: MAX_ORDERS,
    include: orderInclude,
  })
  return { orders: orders.map((order) => presentOrder(order, { forSeller: true })) }
}

export async function getOrdersForAdmin({ status } = {}) {
  const orders = await prisma.order.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: MAX_ORDERS,
    include: orderInclude,
  })
  return { orders: orders.map((order) => presentOrder(order, { forSeller: true })) }
}

/**
 * Moves an order to `nextStatus`, if the flow allows it. `actor` is 'seller' or
 * 'buyer'; a buyer may only cancel, and only before the seller confirms.
 */
async function transitionOrder(where, nextStatus, { actor, reason = '' }) {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({ where, include: orderInclude })

    if (!order) {
      throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND')
    }

    const allowed = STATUS_FLOW[order.status] ?? []
    const buyerMayCancel = actor === 'buyer' && order.status === 'PLACED' && nextStatus === 'CANCELLED'

    if (!allowed.includes(nextStatus) || (actor === 'buyer' && !buyerMayCancel)) {
      throw new ApiError(
        409,
        `An order that is ${order.status.toLowerCase()} cannot be changed to ${nextStatus.toLowerCase()}.`,
        'ORDER_STATUS_INVALID',
      )
    }

    const now = await databaseNow(transaction)

    if (nextStatus === 'CANCELLED') {
      // Back on sale: return the stock and reopen a phone the order had sold out.
      for (const item of order.items) {
        if (!item.listingId) continue
        await lockListing(transaction, item.listingId)
        const listing = await transaction.listing.findUnique({
          where: { id: item.listingId },
          select: { status: true, quantity: true },
        })
        if (!listing) continue
        await transaction.listing.update({
          where: { id: item.listingId },
          data: {
            quantity: listing.quantity + item.quantity,
            ...(listing.status === 'SOLD' ? { status: 'APPROVED' } : {}),
          },
        })
      }
    }

    if (nextStatus === 'COMPLETED') {
      await transaction.seller.update({
        where: { id: order.sellerId },
        data: { completedSales: { increment: order.items.reduce((sum, item) => sum + item.quantity, 0) } },
      })
    }

    const updated = await transaction.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        [STATUS_TIMESTAMP[nextStatus]]: now,
        ...(nextStatus === 'CANCELLED' ? { cancelReason: reason.trim() || null } : {}),
      },
      include: orderInclude,
    })

    // Tell the other side.
    const sellerUser = await transaction.seller.findUnique({
      where: { id: order.sellerId },
      select: { userId: true },
    })
    const recipient = actor === 'buyer' ? sellerUser.userId : order.buyerId
    const who = actor === 'buyer' ? 'The buyer cancelled' : `Order ${order.orderNumber} ${STATUS_MESSAGE[nextStatus]}`
    await transaction.notification.create({
      data: {
        userId: recipient,
        type: 'ORDER_UPDATED',
        message: actor === 'buyer' ? `${who} order ${order.orderNumber}.` : `${who}.`,
        relatedListingId: order.items[0]?.listingId ?? null,
      },
    })

    return presentOrder(updated, { forSeller: actor === 'seller' })
  })
}

export function updateOrderStatusAsSeller(userId, orderId, nextStatus, reason) {
  return transitionOrder({ id: orderId, seller: { userId } }, nextStatus, { actor: 'seller', reason })
}

export function cancelOrderAsBuyer(userId, orderNumber, reason) {
  return transitionOrder({ orderNumber, buyerId: userId }, 'CANCELLED', { actor: 'buyer', reason })
}
