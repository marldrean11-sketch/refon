import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { presentListing, presentPagination } from '../utils/listing-presenter.js'
import { listingInclude, reviewAuthorLabel } from './listing.service.js'

function presentSeller(seller) {
  return {
    id: seller.id,
    userId: seller.userId,
    businessName: seller.businessName,
    contactInfo: seller.contactInfo,
    verificationStatus: seller.verificationStatus,
    moderatorFeedback: seller.moderatorFeedback ?? null,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
    appliedAt: seller.createdAt.toISOString(),
    user: seller.user
      ? {
          id: seller.user.id,
          name: seller.user.name,
          email: seller.user.email,
        }
      : undefined,
  }
}

export async function applyAsSeller(userId, values) {
  return prisma.$transaction(async (transaction) => {
    const existingSeller = await transaction.seller.findUnique({
      where: { userId },
    })

    if (existingSeller?.verificationStatus === 'APPROVED') {
      throw new ApiError(
        409,
        'Your seller profile is already approved.',
        'SELLER_ALREADY_APPROVED',
      )
    }

    // PENDING keeps its status while contact details are refreshed; REJECTED sellers
    // are allowed to re-apply and are reset back to PENDING.
    const seller = existingSeller
      ? await transaction.seller.update({
          where: { id: existingSeller.id },
          data: {
            businessName: values.businessName,
            contactInfo: values.contactInfo,
            verificationStatus: 'PENDING',
            // A fresh application starts clean; stale feedback must not resurface.
            moderatorFeedback: null,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : await transaction.seller.create({
          data: {
            userId,
            businessName: values.businessName,
            contactInfo: values.contactInfo,
            verificationStatus: 'PENDING',
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        })

    await transaction.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    })

    return presentSeller(seller)
  })
}

export async function getSellerProfile(userId) {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!seller) {
    throw new ApiError(404, 'No seller profile exists for this account.', 'SELLER_NOT_FOUND')
  }

  return presentSeller(seller)
}

export async function getPendingSellers() {
  const sellers = await prisma.seller.findMany({
    where: { verificationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return sellers.map(presentSeller)
}

export async function reviewSeller(sellerId, decision, feedback = '') {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new ApiError(422, 'Seller decision must be APPROVED or REJECTED.')
  }

  const feedbackText = (feedback ?? '').trim()

  return prisma.$transaction(async (transaction) => {
    const existingSeller = await transaction.seller.findUnique({ where: { id: sellerId } })

    if (!existingSeller) {
      throw new ApiError(404, 'Seller profile not found.', 'SELLER_NOT_FOUND')
    }

    if (existingSeller.verificationStatus !== 'PENDING') {
      throw new ApiError(409, 'Only pending seller applications can be reviewed.')
    }

    const seller = await transaction.seller.update({
      where: { id: sellerId },
      data: {
        verificationStatus: decision,
        moderatorFeedback: decision === 'REJECTED' ? feedbackText || null : null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const baseMessage =
      decision === 'APPROVED'
        ? 'Your seller application was approved. You can now create listings.'
        : 'Your seller application was rejected. Contact the ReFon team if you have questions.'

    await transaction.notification.create({
      data: {
        userId: seller.userId,
        type: decision === 'APPROVED' ? 'SELLER_APPROVED' : 'SELLER_REJECTED',
        message: feedbackText
          ? `${baseMessage} Reason: ${feedbackText}`
          : baseMessage,
      },
    })

    return presentSeller(seller)
  })
}

// ---------------------------------------------------------------------------
// Public storefront
//
// Everything below is unauthenticated and read-only. The rules are the same three
// the catalog already follows: only APPROVED sellers are addressable, only
// APPROVED listings are visible, and no contact detail, user record, or
// moderation note is ever selected - not filtered out afterwards, never selected
// at all - so a column added to `sellers` later cannot leak by default.
// ---------------------------------------------------------------------------

/** Columns the storefront may expose. Deliberately an allowlist. */
const publicSellerSelect = {
  id: true,
  businessName: true,
  verificationStatus: true,
  createdAt: true,
  city: true,
  region: true,
  tagline: true,
  ratingAverage: true,
  ratingCount: true,
  completedSales: true,
}

/**
 * Loads a seller that is allowed to have a public storefront.
 *
 * An unapproved seller is reported as 404, not 403. A PENDING or REJECTED
 * account has no storefront, so there is no resource to forbid, and answering 403
 * would confirm that the id belongs to a real account with an application on
 * file, which is exactly the kind of existence disclosure a moderation queue
 * should not hand out.
 */
async function findPublicSeller(id) {
  const seller = await prisma.seller.findUnique({
    where: { id },
    select: {
      ...publicSellerSelect,
      _count: {
        select: { listings: { where: { status: 'APPROVED' } } },
      },
    },
  })

  if (!seller || seller.verificationStatus !== 'APPROVED') {
    throw new ApiError(404, 'Seller not found.', 'SELLER_NOT_FOUND')
  }

  return seller
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value
}

function presentPublicSeller(seller) {
  const ratingCount = Number(seller.ratingCount ?? 0)
  const location = [seller.city, seller.region].filter(Boolean).join(', ')

  return {
    id: seller.id,
    businessName: seller.businessName,
    verificationStatus: seller.verificationStatus,
    isVerified: seller.verificationStatus === 'APPROVED',
    tagline: seller.tagline ?? null,
    // `city` and `region` are the storefront's own public fields. `contactInfo` is
    // never read here, so there is no path by which a phone number or an email
    // address can reach this payload.
    city: seller.city ?? null,
    region: seller.region ?? null,
    location: location || null,
    memberSince: String(seller.createdAt.getUTCFullYear()),
    createdAt: toIso(seller.createdAt),
    // Null rather than 0 for a seller with no reviews: a zero average renders as
    // a 0.0 score that reads like bad feedback.
    ratingAverage: ratingCount > 0 ? Number(seller.ratingAverage) : null,
    ratingCount,
    completedSales: Number(seller.completedSales ?? 0),
    approvedListings: seller._count?.listings ?? 0,
    responseTime: 'Usually replies within a few hours',
  }
}

/** Public seller profile for a storefront header. */
export async function getPublicSeller(id) {
  return presentPublicSeller(await findPublicSeller(id))
}

/** Order-by for each storefront sort. `id` is the total-order tiebreaker. */
function storefrontOrderBy(sort) {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }, { id: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }, { id: 'asc' }]
    case 'newest':
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }]
  }
}

/**
 * A seller's approved inventory, paginated.
 *
 * Returns the same `{ listings, pagination }` shape as `GET /api/listings` and
 * presents each row through the same `presentListing`, so the existing listing
 * card renders a storefront row and a catalog row identically.
 *
 * `status: 'APPROVED'` is set here rather than inferred from anything else: a
 * PENDING or REJECTED listing is a moderation artefact and a SOLD one has already
 * left the shop, so none of the three belong in a live storefront.
 */
export async function getPublicSellerListings(id, query = {}) {
  const seller = await findPublicSeller(id)

  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1
  const limit =
    Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 12
  const where = { sellerId: seller.id, status: 'APPROVED' }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: storefrontOrderBy(query.sort),
      take: limit,
      skip: (page - 1) * limit,
      include: listingInclude,
    }),
    prisma.listing.count({ where }),
  ])

  return {
    listings: listings.map(presentListing),
    pagination: presentPagination({ page, pageSize: limit, total }),
  }
}

/**
 * A seller's trust history: the published reviews left across their listings.
 *
 * Reviews belong to a listing rather than to a seller, so this is one seller's
 * listings' published reviews read as a single history. Only PUBLISHED rows on
 * listings a buyer could actually have seen (APPROVED or SOLD) are included, and
 * authors are reduced to initials by the same helper the listing review endpoint
 * uses, because a storefront is still a public page.
 *
 * The `summary` covers every matching review rather than the current page, so the
 * rating shown in the storefront header is the seller's real average and not the
 * average of whichever page happens to be loaded.
 */
export async function getPublicSellerReviews(id, query = {}) {
  const seller = await findPublicSeller(id)

  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1
  const limit =
    Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 5

  const where = {
    status: 'PUBLISHED',
    listing: { sellerId: seller.id, status: { in: ['APPROVED', 'SOLD'] } },
  }

  const [rows, total, bands] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        conditionRating: true,
        sellerRating: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
        listing: { select: { id: true, slug: true, brand: true, model: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: { _all: true },
    }),
  ])

  const reviews = rows.map((row, index) => ({
    id: row.id,
    rating: row.rating,
    title: row.title ?? null,
    comment: row.comment,
    conditionRating: row.conditionRating ?? null,
    sellerRating: row.sellerRating ?? null,
    // The badge is driven purely by the stored flag, never inferred from the
    // rating or the wording of the comment.
    verifiedPurchase: row.verifiedPurchase === true,
    author: reviewAuthorLabel(row.user?.name, index),
    createdAt: toIso(row.createdAt),
    // Naming the device lets a shopper connect a review to a listing, and the
    // listing is public by definition: it is either live or already sold.
    listing: {
      id: row.listing.id,
      slug: row.listing.slug ?? null,
      name: `${row.listing.brand} ${row.listing.model}`,
    },
  }))

  const rated = bands.reduce(
    (sum, band) => sum + band.rating * band._count._all,
    0,
  )
  const countOf = (stars) =>
    bands.find((band) => band.rating === stars)?._count._all ?? 0

  return {
    reviews,
    summary: {
      count: total,
      average: total > 0 ? Number((rated / total).toFixed(2)) : null,
      // Every star band is present, including the zero ones, so the breakdown can
      // render five bars without inventing rows.
      breakdown: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: countOf(stars),
      })),
    },
    pagination: presentPagination({ page, pageSize: limit, total }),
  }
}