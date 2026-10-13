import { prisma } from '../config/prisma.js'

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
