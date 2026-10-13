import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { rememberSuspension } from '../utils/suspension.js'

export async function getAdminStats() {
  const [
    totalSellers,
    pendingSellers,
    totalListings,
    pendingListings,
    totalSold,
    openReports,
  ] = await prisma.$transaction([
    prisma.seller.count(),
    prisma.seller.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'PENDING' } }),
    prisma.listing.count({ where: { status: 'SOLD' } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
  ])

  return {
    totalSellers,
    pendingSellers,
    totalListings,
    pendingListings,
    totalSold,
    openReports,
  }
}

/** Every listing for the admin, newest first, optionally by status or search text. */
export async function getListingsForAdmin({ status, q } = {}) {
  const search = q?.trim()
  const listings = await prisma.listing.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { seller: { businessName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      storage: true,
      price: true,
      status: true,
      createdAt: true,
      seller: { select: { id: true, businessName: true } },
      _count: { select: { reports: { where: { status: 'OPEN' } }, inquiries: true, favorites: true } },
    },
  })

  return listings.map((listing) => ({
    id: listing.id,
    slug: listing.slug,
    brand: listing.brand,
    model: listing.model,
    storage: listing.storage,
    price: Number(listing.price),
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
    seller: listing.seller,
    openReports: listing._count.reports,
    inquiries: listing._count.inquiries,
    saves: listing._count.favorites,
  }))
}

/** Every account for the admin, newest first, by role, status or search text. */
export async function getUsersForAdmin({ role, status, q } = {}) {
  const search = q?.trim()
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status === 'SUSPENDED' ? { suspendedAt: { not: null } } : {}),
      ...(status === 'ACTIVE' ? { suspendedAt: null } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      emailVerifiedAt: true,
      suspendedAt: true,
      suspendedReason: true,
      createdAt: true,
      seller: { select: { id: true, businessName: true } },
      _count: { select: { orders: true, reviews: true, buyerInquiries: true } },
    },
  })

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    emailVerified: Boolean(user.emailVerifiedAt),
    suspended: Boolean(user.suspendedAt),
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    suspendedReason: user.suspendedReason ?? null,
    joinedAt: user.createdAt.toISOString(),
    seller: user.seller,
    orders: user._count.orders,
    reviews: user._count.reviews,
    inquiries: user._count.buyerInquiries,
  }))
}

/** Suspends or restores an account. Admin accounts, and the admin's own, are off limits. */
export async function setUserSuspension(adminUserId, userId, suspend, reason = '') {
  if (adminUserId === userId) {
    throw new ApiError(409, 'You cannot suspend your own account.', 'CANNOT_SUSPEND_SELF')
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) {
    throw new ApiError(404, 'Account not found.', 'USER_NOT_FOUND')
  }
  if (user.role === 'ADMIN') {
    throw new ApiError(409, 'Admin accounts cannot be suspended here.', 'CANNOT_SUSPEND_ADMIN')
  }

  await prisma.user.update({
    where: { id: userId },
    data: suspend
      ? { suspendedAt: new Date(), suspendedReason: reason.trim() || null }
      : { suspendedAt: null, suspendedReason: null },
  })
  rememberSuspension(userId, suspend)

  const [updated] = await getUsersForAdmin({ q: undefined }).then((all) =>
    all.filter((entry) => entry.id === userId),
  )
  return updated ?? null
}

/**
 * Takes a live or pending listing off the marketplace directly, with a reason
 * the seller sees, without waiting for a buyer report. Same outcome as a
 * report take-down: the listing becomes REJECTED with moderator feedback.
 */
export async function takeDownListing(listingId, feedback) {
  return prisma.$transaction(async (transaction) => {
    const listing = await transaction.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, brand: true, model: true, seller: { select: { userId: true } } },
    })
    if (!listing) {
      throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
    }
    if (listing.status === 'SOLD' || listing.status === 'REJECTED') {
      throw new ApiError(
        409,
        `A ${listing.status.toLowerCase()} listing cannot be taken down.`,
        'LISTING_NOT_TAKEDOWN_ELIGIBLE',
      )
    }

    await transaction.listing.update({
      where: { id: listingId },
      data: { status: 'REJECTED', moderatorFeedback: feedback },
    })
    await transaction.notification.create({
      data: {
        userId: listing.seller.userId,
        type: 'LISTING_TAKEN_DOWN',
        message: `Your ${listing.brand} ${listing.model} listing was taken down by a moderator. Reason: ${feedback}`,
        relatedListingId: listingId,
      },
    })
    return { id: listingId, status: 'REJECTED' }
  })
}
