import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { presentPagination } from '../utils/listing-presenter.js'
import { presentPublicSeller, publicSellerSelect } from './seller.service.js'

const PREVIEW_COUNT = 3

/** Order-by for each directory sort. `id` keeps pages stable. */
function directoryOrderBy(sort) {
  switch (sort) {
    case 'sales':
      return [{ completedSales: 'desc' }, { ratingAverage: 'desc' }, { id: 'asc' }]
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'asc' }]
    case 'rating':
    default:
      return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }, { completedSales: 'desc' }, { id: 'asc' }]
  }
}

// Built on first use: seller.service and listing.service import each other
// through this file, so nothing here may read their exports at load time.
const directorySelect = () => ({
  ...publicSellerSelect,
  _count: {
    select: {
      listings: { where: { status: 'APPROVED' } },
      followers: true,
    },
  },
  listings: {
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: PREVIEW_COUNT,
    select: { id: true, slug: true, brand: true, model: true, photos: true },
  },
})

/**
 * The public "Phone Stores" directory: every verified store, with its branding,
 * rating, sales, live phone count and a peek at its newest phones. Only fields
 * the storefront already makes public are read, so nothing private can leak.
 */
export async function getStoreDirectory(query = {}, userId = null) {
  const page = query.page ?? 1
  const limit = query.limit ?? 12
  const search = query.q?.trim()
  const city = query.city?.trim()

  if (query.following && !userId) {
    throw new ApiError(401, 'Sign in to see the stores you follow.', 'AUTH_REQUIRED')
  }

  const where = {
    verificationStatus: 'APPROVED',
    ...(search ? { businessName: { contains: search, mode: 'insensitive' } } : {}),
    ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
    ...(query.following ? { followers: { some: { userId } } } : {}),
  }

  const [rows, total, cityRows] = await Promise.all([
    prisma.seller.findMany({
      where,
      orderBy: directoryOrderBy(query.sort),
      take: limit,
      skip: (page - 1) * limit,
      select: directorySelect(),
    }),
    prisma.seller.count({ where }),
    prisma.seller.findMany({
      where: { verificationStatus: 'APPROVED', city: { not: null } },
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    }),
  ])

  const followed = userId
    ? new Set(
        (
          await prisma.storeFollow.findMany({
            where: { userId, sellerId: { in: rows.map((row) => row.id) } },
            select: { sellerId: true },
          })
        ).map((row) => row.sellerId),
      )
    : new Set()

  return {
    stores: rows.map((row) => ({
      ...presentPublicSeller(row),
      followerCount: row._count.followers,
      following: followed.has(row.id),
      preview: row.listings.map((listing) => ({
        id: listing.id,
        slug: listing.slug ?? null,
        name: `${listing.brand} ${listing.model}`,
        photo: listing.photos[0] ?? null,
      })),
    })),
    cities: cityRows.map((row) => row.city).filter(Boolean),
    pagination: presentPagination({ page, pageSize: limit, total }),
  }
}

async function findFollowableSeller(sellerId) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true, userId: true, verificationStatus: true },
  })
  if (!seller || seller.verificationStatus !== 'APPROVED') {
    throw new ApiError(404, 'Seller not found.', 'SELLER_NOT_FOUND')
  }
  return seller
}

export async function getFollowState(sellerId, userId = null) {
  await findFollowableSeller(sellerId)
  const [followerCount, mine] = await Promise.all([
    prisma.storeFollow.count({ where: { sellerId } }),
    userId
      ? prisma.storeFollow.findUnique({
          where: { userId_sellerId: { userId, sellerId } },
          select: { id: true },
        })
      : null,
  ])
  return { following: Boolean(mine), followerCount }
}

export async function followStore(userId, sellerId) {
  const seller = await findFollowableSeller(sellerId)
  if (seller.userId === userId) {
    throw new ApiError(403, 'You cannot follow your own store.', 'CANNOT_FOLLOW_OWN_STORE')
  }
  await prisma.storeFollow.upsert({
    where: { userId_sellerId: { userId, sellerId } },
    update: {},
    create: { userId, sellerId },
  })
  return getFollowState(sellerId, userId)
}

export async function unfollowStore(userId, sellerId) {
  await prisma.storeFollow.deleteMany({ where: { userId, sellerId } })
  return getFollowState(sellerId, userId)
}

/**
 * Tells everyone who follows a store that it has a new phone live. Called inside
 * the moderation transaction, so the alert only exists if the approval does.
 */
export async function notifyStoreFollowers(transaction, { sellerId, listingId, label, storeName }) {
  const followers = await transaction.storeFollow.findMany({
    where: { sellerId },
    select: { userId: true },
  })
  if (followers.length === 0) return
  await transaction.notification.createMany({
    data: followers.map((follower) => ({
      userId: follower.userId,
      type: 'NEW_FROM_FOLLOWED_STORE',
      message: `${storeName} just listed a ${label}.`,
      relatedListingId: listingId,
    })),
  })
}
