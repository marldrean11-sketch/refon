import { prisma } from '../config/prisma.js'

export async function getAdminStats() {
  const [
    totalSellers,
    pendingSellers,
    totalListings,
    pendingListings,
    totalSold,
  ] = await prisma.$transaction([
    prisma.seller.count(),
    prisma.seller.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'PENDING' } }),
    prisma.listing.count({ where: { status: 'SOLD' } }),
  ])

  return {
    totalSellers,
    pendingSellers,
    totalListings,
    pendingListings,
    totalSold,
  }
}
