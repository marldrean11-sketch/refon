import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { presentReplies } from './inquiry.service.js'

const MAX_INQUIRIES = 100

function presentMyInquiry(inquiry) {
  const listing = inquiry.listing

  return {
    id: inquiry.id,
    listingId: inquiry.listingId,
    message: inquiry.message,
    buyerContact: inquiry.buyerContact,
    createdAt: inquiry.createdAt.toISOString(),
    replies: presentReplies(inquiry.replies),
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

const myInquiryReplies = {
  orderBy: { createdAt: 'asc' },
  select: { id: true, fromSeller: true, body: true, createdAt: true },
}

const myInquirySelect = {
  id: true,
  listingId: true,
  message: true,
  buyerContact: true,
  createdAt: true,
  replies: myInquiryReplies,
  listing: {
    select: { id: true, brand: true, model: true, status: true, photos: true, price: true },
  },
}

export async function getMyInquiries(userId) {
  // Scoped to buyerId so a seller can never read another account's inquiries.
  // Only the listing summary is selected, which keeps seller contact details out
  // of the response entirely.
  const inquiries = await prisma.inquiry.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_INQUIRIES,
    select: {
      id: true,
      listingId: true,
      message: true,
      buyerContact: true,
      createdAt: true,
      replies: myInquiryReplies,
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
    },
  })

  return { inquiries: inquiries.map(presentMyInquiry) }
}

/** A signed-in buyer follows up in the thread of their own inquiry. */
export async function replyToMyInquiry(id, userId, body) {
  const inquiry = await prisma.inquiry.findFirst({
    where: { id, buyerId: userId },
    select: {
      id: true,
      listing: { select: { id: true, brand: true, model: true, seller: { select: { userId: true } } } },
    },
  })

  if (!inquiry) {
    throw new ApiError(404, 'Inquiry not found.', 'INQUIRY_NOT_FOUND')
  }

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.inquiryReply.create({
      data: { inquiryId: inquiry.id, authorId: userId, fromSeller: false, body },
    })

    await transaction.notification.create({
      data: {
        userId: inquiry.listing.seller.userId,
        type: 'INQUIRY_REPLY',
        message: `The buyer replied about the ${inquiry.listing.brand} ${inquiry.listing.model}.`,
        relatedListingId: inquiry.listing.id,
      },
    })

    // Back to unread, so the follow-up shows in the seller's inbox count.
    return transaction.inquiry.update({
      where: { id: inquiry.id },
      data: { isRead: false },
      select: myInquirySelect,
    })
  })

  return presentMyInquiry(updated)
}
