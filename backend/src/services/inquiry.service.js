import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

const MAX_INQUIRIES = 200

const inquiryInclude = {
  listing: {
    select: {
      id: true,
      brand: true,
      model: true,
      status: true,
      photos: true,
      price: true,
    },
  },
}

function presentInquiry(inquiry) {
  const listing = inquiry.listing

  return {
    id: inquiry.id,
    listingId: inquiry.listingId,
    buyerName: inquiry.buyerName,
    buyerContact: inquiry.buyerContact,
    message: inquiry.message,
    isRead: inquiry.isRead,
    createdAt: inquiry.createdAt.toISOString(),
    listing: {
      id: listing.id,
      brand: listing.brand,
      model: listing.model,
      status: listing.status,
      mainPhoto: listing.photos[0] ?? null,
      price: Number(listing.price),
    },
  }
}

export async function getSellerInquiries(userId, { status = 'all', listingId } = {}) {
  // Ownership is enforced through the relation so a seller can never read or
  // acknowledge inquiries that belong to another seller's listings.
  const where = {
    listing: { seller: { userId } },
  }

  if (status === 'unread') {
    where.isRead = false
  }

  if (listingId) {
    where.listingId = listingId
  }

  const [inquiries, unreadCount] = await prisma.$transaction([
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_INQUIRIES,
      include: inquiryInclude,
    }),
    // The badge always counts every unread inquiry for this seller, so it must
    // ignore both the status and listingId filters applied to the list above.
    prisma.inquiry.count({
      where: { listing: { seller: { userId } }, isRead: false },
    }),
  ])

  return {
    inquiries: inquiries.map(presentInquiry),
    unreadCount,
  }
}

export async function markInquiryRead(id, userId) {
  const inquiry = await prisma.inquiry.findFirst({
    where: { id, listing: { seller: { userId } } },
    include: inquiryInclude,
  })

  if (!inquiry) {
    throw new ApiError(404, 'Inquiry not found.', 'INQUIRY_NOT_FOUND')
  }

  if (inquiry.isRead) {
    return presentInquiry(inquiry)
  }

  const updatedInquiry = await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { isRead: true },
    include: inquiryInclude,
  })

  return presentInquiry(updatedInquiry)
}

export async function markAllSellerInquiriesRead(userId) {
  const result = await prisma.inquiry.updateMany({
    where: { isRead: false, listing: { seller: { userId } } },
    data: { isRead: true },
  })

  return { updatedCount: result.count }
}
