function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value
}

export function presentListing(listing) {
  const seller = listing.seller

  return {
    id: listing.id,
    sellerId: listing.sellerId,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    price: Number(listing.price),
    batteryPercent: listing.batteryPercent,
    storage: listing.storage,
    condition: listing.cosmeticCondition,
    color: listing.color ?? 'As pictured',
    conditionNotes: listing.conditionNotes,
    photos: listing.photos,
    mainPhoto: listing.photos[0] ?? null,
    status: listing.status,
    moderatorFeedback: listing.moderatorFeedback,
    createdAt: toIsoString(listing.createdAt),
    updatedAt: toIsoString(listing.updatedAt),
    sellerName: seller.businessName,
    seller: {
      id: seller.id,
      businessName: seller.businessName,
      verificationStatus: seller.verificationStatus,
      memberSince: String(seller.createdAt.getUTCFullYear()),
      completedSales: seller._count?.listings ?? 0,
      responseTime:
        seller.verificationStatus === 'APPROVED'
          ? 'Usually replies within a few hours'
          : 'Verification in progress',
    },
  }
}
