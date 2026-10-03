import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { listingInclude } from './listing.service.js'
import { presentListing } from '../utils/listing-presenter.js'

const MAX_FAVORITES = 200

// Buyers keep seeing listings they saved after those listings sell, so sold
// inventory stays in the saved list; drafts and rejected work stays hidden.
const visibleStatuses = ['APPROVED', 'SOLD']

export async function getMyFavorites(userId) {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      listing: { status: { in: visibleStatuses } },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_FAVORITES,
    include: { listing: { include: listingInclude } },
  })

  return {
    listings: favorites.map((favorite) => ({
      ...presentListing(favorite.listing),
      savedAt: favorite.createdAt.toISOString(),
    })),
    ids: favorites.map((favorite) => favorite.listingId),
  }
}

export async function saveFavorite(userId, listingId) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true },
  })

  if (!listing) {
    throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
  }

  if (listing.status !== 'APPROVED') {
    throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
  }

  await prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  })

  return { saved: true }
}

export async function removeFavorite(userId, listingId) {
  // Deleting nothing is a success so repeated unsaves stay harmless.
  await prisma.favorite.deleteMany({ where: { userId, listingId } })

  return { removed: true }
}
