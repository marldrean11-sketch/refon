import { prisma } from '../config/prisma.js'

const CACHE_MS = 60_000
let cached = null

/**
 * The homepage's social proof: running totals and the latest phones sold.
 * Public and anonymous: no buyer is ever named, only the phone and the
 * seller's city. Cached for a minute so the homepage never waits on it.
 */
export async function getHomeStats() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value

  const [phonesSold, liveListings, verifiedSellers, healthChecks, tradeIns, recent] = await Promise.all([
    prisma.listing.count({ where: { status: 'SOLD' } }),
    prisma.listing.count({ where: { status: 'APPROVED' } }),
    prisma.seller.count({ where: { verificationStatus: 'APPROVED' } }),
    prisma.healthCheckRun.count(),
    prisma.tradeInRequest.count(),
    prisma.listing.findMany({
      where: { status: 'SOLD' },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        slug: true,
        brand: true,
        model: true,
        storage: true,
        conditionGrade: true,
        photos: true,
        price: true,
        updatedAt: true,
        seller: { select: { businessName: true, city: true, region: true } },
      },
    }),
  ])

  const value = {
    totals: { phonesSold, liveListings, verifiedSellers, healthChecks, tradeIns },
    recentSales: recent.map((listing) => ({
      id: listing.id,
      slug: listing.slug ?? null,
      brand: listing.brand,
      model: listing.model,
      storage: listing.storage,
      grade: listing.conditionGrade ?? null,
      photo: listing.photos[0] ?? null,
      price: Number(listing.price),
      sellerName: listing.seller.businessName,
      location: [listing.seller.city, listing.seller.region].filter(Boolean).join(', ') || null,
      soldAt: listing.updatedAt.toISOString(),
    })),
  }

  cached = { at: Date.now(), value }
  return value
}
