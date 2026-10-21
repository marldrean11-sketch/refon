import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

/**
 * Buyer reviews.
 *
 * Only a buyer whose order for the phone is COMPLETED can review it, once per
 * phone. The review is published straight away with the verified-purchase
 * badge, and the seller's rating (the average seller score over their
 * published, non-sample reviews, as the seed computes it) is recalculated.
 */
export async function createOrderReview(userId, orderNumber, values) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, buyerId: userId },
    select: {
      id: true,
      status: true,
      sellerId: true,
      seller: { select: { userId: true } },
      items: { select: { listingId: true, brand: true, model: true } },
    },
  })

  if (!order) {
    throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND')
  }

  if (order.status !== 'COMPLETED') {
    throw new ApiError(
      409,
      'You can review a phone once its order is completed.',
      'ORDER_NOT_COMPLETED',
    )
  }

  const item = order.items.find((entry) => entry.listingId === values.listingId)

  if (!item) {
    throw new ApiError(404, 'That phone is not part of this order.', 'ORDER_ITEM_NOT_FOUND')
  }

  try {
    const review = await prisma.$transaction(async (transaction) => {
      const created = await transaction.review.create({
        data: {
          listingId: item.listingId,
          userId,
          verifiedPurchase: true,
          rating: values.rating,
          title: values.title?.trim() || null,
          comment: values.comment.trim(),
          conditionRating: values.conditionRating ?? null,
          sellerRating: values.sellerRating ?? null,
          status: 'PUBLISHED',
        },
      })

      await refreshSellerRating(transaction, order.sellerId)

      await transaction.notification.create({
        data: {
          userId: order.seller.userId,
          type: 'ORDER_UPDATED',
          message: `New ${values.rating}★ review on your ${item.brand} ${item.model}.`,
          relatedListingId: item.listingId,
        },
      })

      return created
    })

    return {
      id: review.id,
      listingId: review.listingId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      conditionRating: review.conditionRating,
      sellerRating: review.sellerRating,
      createdAt: review.createdAt.toISOString(),
    }
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ApiError(409, 'You have already reviewed this phone.', 'REVIEW_EXISTS')
    }
    throw error
  }
}

async function refreshSellerRating(transaction, sellerId) {
  const rows = await transaction.review.findMany({
    where: {
      listing: { sellerId },
      status: 'PUBLISHED',
      isSample: false,
      sellerRating: { not: null },
    },
    select: { sellerRating: true },
  })

  const average =
    rows.length > 0
      ? Number((rows.reduce((sum, row) => sum + row.sellerRating, 0) / rows.length).toFixed(2))
      : 0

  await transaction.seller.update({
    where: { id: sellerId },
    data: { ratingAverage: average, ratingCount: rows.length },
  })
}

/** The listing ids this buyer has already reviewed, out of `listingIds`. */
export async function reviewedListingIds(userId, listingIds) {
  if (listingIds.length === 0) return new Set()
  const rows = await prisma.review.findMany({
    where: { userId, listingId: { in: listingIds } },
    select: { listingId: true },
  })
  return new Set(rows.map((row) => row.listingId))
}
