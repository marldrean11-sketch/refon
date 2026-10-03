import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../config/prisma.js'
import { uploadsDirectory } from '../config/uploads.js'
import { ApiError } from '../utils/api-error.js'
import { presentListing } from '../utils/listing-presenter.js'

const listingInclude = {
  seller: {
    select: {
      id: true,
      businessName: true,
      verificationStatus: true,
      createdAt: true,
      _count: {
        select: {
          listings: { where: { status: 'SOLD' } },
        },
      },
    },
  },
}

function getManagedUploadFilename(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
    return null
  }

  let relativePath
  try {
    relativePath = decodeURIComponent(url.slice('/uploads/'.length))
  } catch {
    return null
  }
  if (
    !relativePath ||
    relativePath.includes('/') ||
    relativePath.includes('\\') ||
    relativePath.startsWith('seed/')
  ) {
    return null
  }

  return relativePath
}

async function removeUnreferencedPhotos(urls) {
  const uniqueUrls = [...new Set(urls)]

  for (const url of uniqueUrls) {
    const filename = getManagedUploadFilename(url)
    if (!filename) {
      continue
    }

    const reference = await prisma.listing.findFirst({
      where: { photos: { has: url } },
      select: { id: true },
    })

    if (reference) {
      continue
    }

    try {
      await fs.unlink(path.join(uploadsDirectory, filename))
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn(`Could not remove orphaned upload ${filename}:`, error.message)
      }
    }
  }
}

function listingData(values) {
  const photos = [...values.photos]
  const mainPhoto = values.mainPhoto ?? photos[0]

  if (mainPhoto && !photos.includes(mainPhoto)) {
    throw new ApiError(
      422,
      'The Main Photo must be one of the listing photos.',
      'INVALID_MAIN_PHOTO',
    )
  }

  const orderedPhotos = mainPhoto
    ? [mainPhoto, ...photos.filter((photo) => photo !== mainPhoto)]
    : photos

  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: values.year,
    price: values.price,
    batteryPercent: values.batteryPercent,
    storage: values.storage.trim(),
    cosmeticCondition: values.condition,
    color: values.color?.trim() || null,
    conditionNotes: values.conditionNotes.trim(),
    photos: orderedPhotos,
  }
}

async function getApprovedSeller(userId) {
  const seller = await prisma.seller.findUnique({ where: { userId } })

  if (!seller) {
    throw new ApiError(403, 'Apply as a seller before creating listings.', 'SELLER_PROFILE_REQUIRED')
  }

  if (seller.verificationStatus !== 'APPROVED') {
    throw new ApiError(
      403,
      'Your seller profile must be approved before creating listings.',
      'SELLER_NOT_APPROVED',
    )
  }

  return seller
}

export async function createListing(userId, values) {
  const seller = await getApprovedSeller(userId)
  const listing = await prisma.listing.create({
    data: {
      ...listingData(values),
      sellerId: seller.id,
      status: 'PENDING',
    },
    include: listingInclude,
  })

  return presentListing(listing)
}

export async function getSellerListings(userId) {
  const seller = await prisma.seller.findUnique({ where: { userId } })

  if (!seller) {
    throw new ApiError(404, 'No seller profile exists for this account.', 'SELLER_NOT_FOUND')
  }

  const listings = await prisma.listing.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: 'desc' },
    include: listingInclude,
  })

  return listings.map(presentListing)
}

async function findOwnedListing(id, userId) {
  const listing = await prisma.listing.findFirst({
    where: { id, seller: { userId } },
    include: listingInclude,
  })

  if (!listing) {
    throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
  }

  return listing
}

export async function updateListing(id, userId, values) {
  const listing = await findOwnedListing(id, userId)

  if (!['PENDING', 'REJECTED'].includes(listing.status)) {
    throw new ApiError(
      409,
      'Only pending or rejected listings can be edited.',
      'LISTING_LOCKED',
    )
  }

  const updatedListing = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...listingData(values),
      status: 'PENDING',
      moderatorFeedback: null,
    },
    include: listingInclude,
  })

  const nextPhotos = values.photos
  const removedPhotos = listing.photos.filter((photo) => !nextPhotos.includes(photo))
  await removeUnreferencedPhotos(removedPhotos)

  return presentListing(updatedListing)
}

export async function deleteListing(id, userId) {
  const listing = await findOwnedListing(id, userId)

  if (!['PENDING', 'REJECTED'].includes(listing.status)) {
    throw new ApiError(
      409,
      'Only pending or rejected listings can be deleted.',
      'LISTING_LOCKED',
    )
  }

  const photos = listing.photos
  await prisma.listing.delete({ where: { id: listing.id } })
  await removeUnreferencedPhotos(photos)
}

export async function getApprovedListings(filters = {}) {
  const where = { status: 'APPROVED' }
  const and = []

  if (filters.brand) {
    where.brand = { equals: filters.brand, mode: 'insensitive' }
  }

  if (Number.isInteger(filters.year)) {
    and.push({ year: filters.year })
  }

  if (Number.isInteger(filters.minYear) || Number.isInteger(filters.maxYear)) {
    and.push({
      year: {
        ...(Number.isInteger(filters.minYear) ? { gte: filters.minYear } : {}),
        ...(Number.isInteger(filters.maxYear) ? { lte: filters.maxYear } : {}),
      },
    })
  }

  if (Number.isFinite(filters.minPrice) || Number.isFinite(filters.maxPrice)) {
    and.push({
      price: {
        ...(Number.isFinite(filters.minPrice) ? { gte: filters.minPrice } : {}),
        ...(Number.isFinite(filters.maxPrice) ? { lte: filters.maxPrice } : {}),
      },
    })
  }

  const search = filters.search ?? filters.q

  if (search) {
    and.push({
      OR: [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  if (and.length > 0) {
    where.AND = and
  }

  const orderBy = {
    'price-asc': { price: 'asc' },
    'price-desc': { price: 'desc' },
    newest: { createdAt: 'desc' },
  }[filters.sort] ?? { createdAt: 'desc' }

  const [listings, brandRows] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      include: listingInclude,
    }),
    prisma.listing.findMany({
      where: { status: 'APPROVED' },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    }),
  ])

  return {
    listings: listings.map(presentListing),
    brands: brandRows.map((row) => row.brand),
  }
}

export async function getApprovedListing(id) {
  const listing = await prisma.listing.findFirst({
    where: { id, status: { in: ['APPROVED', 'SOLD'] } },
    include: listingInclude,
  })

  if (!listing) {
    throw new ApiError(404, 'Approved listing not found.', 'LISTING_NOT_FOUND')
  }

  return presentListing(listing)
}

export async function markListingSold(id, userId) {
  return prisma.$transaction(async (transaction) => {
    const listing = await transaction.listing.findFirst({
      where: { id, seller: { userId } },
      select: {
        id: true,
        status: true,
        brand: true,
        model: true,
        seller: { select: { userId: true } },
      },
    })

    if (!listing) {
      throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
    }

    if (listing.status !== 'APPROVED') {
      throw new ApiError(
        409,
        'Only approved listings can be marked as sold.',
        'LISTING_NOT_APPROVED',
      )
    }

    const soldListing = await transaction.listing.update({
      where: { id: listing.id },
      data: { status: 'SOLD' },
      include: listingInclude,
    })

    const inquiryRows = await transaction.inquiry.findMany({
      where: { listingId: listing.id, buyerId: { not: null } },
      distinct: ['buyerId'],
      select: { buyerId: true },
    })
    const buyerIds = [
      ...new Set(
        inquiryRows
          .map((inquiry) => inquiry.buyerId)
          .filter((buyerId) => buyerId && buyerId !== listing.seller.userId),
      ),
    ]

    if (buyerIds.length > 0) {
      await transaction.notification.createMany({
        data: buyerIds.map((buyerId) => ({
          userId: buyerId,
          type: 'LISTING_SOLD',
          message: `The ${listing.brand} ${listing.model} you inquired about has been sold.`,
          relatedListingId: listing.id,
        })),
      })
    }

    return presentListing(soldListing)
  })
}

export async function getPendingListings() {
  const listings = await prisma.listing.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: listingInclude,
  })

  return listings.map(presentListing)
}

export async function reviewListing(id, decision, feedback = '') {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new ApiError(422, 'Listing decision must be APPROVED or REJECTED.')
  }

  const feedbackText = (feedback ?? '').trim()

  return prisma.$transaction(async (transaction) => {
    const existingListing = await transaction.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        brand: true,
        model: true,
        seller: { select: { userId: true } },
      },
    })

    if (!existingListing) {
      throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
    }

    if (existingListing.status !== 'PENDING') {
      throw new ApiError(409, 'Only pending listings can be reviewed.')
    }

    const listing = await transaction.listing.update({
      where: { id },
      data: {
        status: decision,
        moderatorFeedback:
          decision === 'REJECTED' ? feedbackText || null : null,
      },
      include: listingInclude,
    })

    const message =
      decision === 'APPROVED'
        ? `${existingListing.brand} ${existingListing.model} was approved and is now live.`
        : `${existingListing.brand} ${existingListing.model} was rejected. Moderator feedback: ${
            feedbackText || 'No feedback was provided.'
          }`

    await transaction.notification.create({
      data: {
        userId: existingListing.seller.userId,
        type:
          decision === 'APPROVED'
            ? 'LISTING_APPROVED'
            : 'LISTING_REJECTED',
        message,
        relatedListingId: existingListing.id,
      },
    })

    return presentListing(listing)
  })
}

export async function createInquiry(listingId, values, buyerUserId = null) {
  const inquiry = await prisma.$transaction(async (transaction) => {
    const listing = await transaction.listing.findFirst({
      where: { id: listingId, status: 'APPROVED' },
      select: {
        id: true,
        brand: true,
        model: true,
        seller: { select: { userId: true } },
      },
    })

    if (!listing) {
      throw new ApiError(404, 'This listing is not accepting inquiries.', 'LISTING_NOT_FOUND')
    }

    const createdInquiry = await transaction.inquiry.create({
      data: {
        listingId: listing.id,
        buyerId: buyerUserId,
        buyerName: values.buyerName.trim(),
        buyerContact: values.buyerContact.trim(),
        message: values.message.trim(),
      },
    })

    await transaction.notification.create({
      data: {
        userId: listing.seller.userId,
        type: 'NEW_INQUIRY',
        message: `New inquiry from ${values.buyerName.trim()} for ${listing.brand} ${listing.model}.`,
        relatedListingId: listing.id,
      },
    })

    if (buyerUserId) {
      await transaction.notification.create({
        data: {
          userId: buyerUserId,
          type: 'INQUIRY_SENT',
          message: `Your inquiry about the ${listing.brand} ${listing.model} was sent.`,
          relatedListingId: listing.id,
        },
      })
    }

    return createdInquiry
  })

  return {
    id: inquiry.id,
    listingId: inquiry.listingId,
    buyerName: inquiry.buyerName,
    buyerContact: inquiry.buyerContact,
    message: inquiry.message,
    createdAt: inquiry.createdAt.toISOString(),
  }
}

export async function getListingInquiries(listingId, userId) {
  const listing = await findOwnedListing(listingId, userId)
  const inquiries = await prisma.inquiry.findMany({
    where: { listingId: listing.id },
    orderBy: { createdAt: 'desc' },
  })

  return inquiries.map((inquiry) => ({
    id: inquiry.id,
    listingId: inquiry.listingId,
    buyerName: inquiry.buyerName,
    buyerContact: inquiry.buyerContact,
    message: inquiry.message,
    isRead: inquiry.isRead,
    createdAt: inquiry.createdAt.toISOString(),
  }))
}
