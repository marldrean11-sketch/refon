import { prisma } from '../config/prisma.js'

const MAX_INQUIRIES = 100

function presentMyInquiry(inquiry) {
  const listing = inquiry.listing

  return {
    id: inquiry.id,
    listingId: inquiry.listingId,
    message: inquiry.message,
    buyerContact: inquiry.buyerContact,
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
