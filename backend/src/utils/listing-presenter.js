import {
  CONDITION_GRADES,
  GRADE_LABELS,
  INSPECTION_CHECK_IDS,
  gradeLabel,
} from './catalog-taxonomy.js'

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Resolves a listing's grade.
 *
 * The graded column is nullable so rows written before the migration, and
 * listings created through the legacy seller form, still render a grade. The
 * fallback maps the free-text condition label; anything unrecognised falls to
 * Grade C, the most conservative tier.
 */
export function resolveGrade(listing) {
  if (listing.conditionGrade) {
    return listing.conditionGrade
  }

  const label = String(listing.cosmeticCondition ?? '').trim().toLowerCase()
  const matched = Object.entries(CONDITION_GRADES.legacyLabels).find(
    ([legacy]) => legacy.toLowerCase() === label,
  )

  return matched ? matched[1] : 'C'
}

/**
 * Discount figures.
 *
 * A discount is only ever reported when the reference price is genuinely higher
 * than the selling price. Returns nulls otherwise so the UI has nothing to
 * render rather than a misleading zero.
 */
export function resolveDiscount(price, originalPrice, storedPercent) {
  const current = Number(price)
  const reference = Number(originalPrice)

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(reference) ||
    reference <= current ||
    reference <= 0
  ) {
    return { originalPrice: null, savings: null, discountPercent: null }
  }

  const savings = reference - current

  // Prefer the stored figure so the number shown on a card is the same value
  // the catalog sorted by, rather than a second rounding pass that could differ.
  const percent =
    Number.isInteger(storedPercent) && storedPercent > 0
      ? storedPercent
      : Math.round((savings / reference) * 100)

  return {
    originalPrice: reference,
    savings,
    discountPercent: percent,
  }
}

/**
 * Review aggregate for a listing.
 *
 * Returns nulls when there are no published reviews, so a card can say "no
 * reviews yet" instead of rendering a 0.0 score.
 */
export function resolveReviewAggregate(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { reviewCount: 0, reviewAverage: null }
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0)

  return {
    reviewCount: reviews.length,
    reviewAverage: Number((total / reviews.length).toFixed(2)),
  }
}

/**
 * Inspection summary.
 *
 * `recorded: false` means no checks were captured for this device, which the UI
 * presents differently from "checks were recorded but the set is incomplete".
 */
export function resolveInspection(listing) {
  const recorded = Array.isArray(listing.inspectionChecks)
    ? listing.inspectionChecks.filter((id) => INSPECTION_CHECK_IDS.includes(id))
    : []

  const unique = [...new Set(recorded)]

  return {
    inspectionRecorded: unique.length > 0,
    inspectionChecks: unique,
    inspectionTotal: INSPECTION_CHECK_IDS.length,
    inspectionComplete: unique.length === INSPECTION_CHECK_IDS.length,
  }
}

/**
 * Public shape of a listing.
 *
 * Every field the existing API returned is still returned, unchanged, so current
 * consumers and the marketplace E2E suite keep passing. New fields are additive.
 * Seller contact details are never included — that has always been the case and
 * the catalog makes it a larger surface, so it is asserted in tests.
 */
export function presentListing(listing) {
  const seller = listing.seller
  const grade = resolveGrade(listing)
  const discount = resolveDiscount(
    listing.price,
    listing.originalPrice,
    listing.discountPercent,
  )
  const inspection = resolveInspection(listing)
  const reviews = resolveReviewAggregate(listing.reviews)

  const sellerRatingAverage = Number(seller.ratingAverage ?? 0)
  const sellerRatingCount = Number(seller.ratingCount ?? 0)

  return {
    // Existing contract, unchanged.
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
      completedSales: seller._count?.listings ?? seller.completedSales ?? 0,
      responseTime:
        seller.verificationStatus === 'APPROVED'
          ? 'Usually replies within a few hours'
          : 'Verification in progress',
      // Catalog fields.
      city: seller.city ?? null,
      region: seller.region ?? null,
      tagline: seller.tagline ?? null,
      ratingAverage: sellerRatingCount > 0 ? sellerRatingAverage : null,
      ratingCount: sellerRatingCount,
    },

    // Catalog fields.
    slug: listing.slug ?? null,
    ram: listing.ram ?? null,
    operatingSystem: listing.operatingSystem ?? null,
    networkType: listing.networkType ?? null,
    processor: listing.processor ?? null,
    displaySpec: listing.displaySpec ?? null,
    cameraSpec: listing.cameraSpec ?? null,
    categoryTags: listing.categoryTags ?? [],
    quantity: listing.quantity ?? 1,
    viewsCount: listing.viewsCount ?? 0,
    isFeatured: listing.isFeatured ?? false,

    // Grading.
    grade,
    gradeLabel: gradeLabel(grade),
    gradeStated: Boolean(listing.conditionGrade),

    // Warranty.
    warrantyMonths: listing.warrantyMonths ?? 0,
    warrantyLabel:
      (listing.warrantyMonths ?? 0) > 0
        ? `${listing.warrantyMonths}-month warranty`
        : 'Sold as-is',

    // Price presentation.
    originalPrice: discount.originalPrice,
    savings: discount.savings,
    discountPercent: discount.discountPercent,

    // Trust signals.
    // `imeiVerified` is a ReFon moderator's check, never the seller's word. The
    // full IMEI and its fingerprint are never sent to the browser.
    imeiVerified: listing.imeiVerified ?? false,
    imeiLast4: listing.imeiLast4 ?? null,
    imeiOnFile: Boolean(listing.imeiHash || listing.imeiLast4),
    imeiCheckedAt: listing.imeiCheckedAt ? listing.imeiCheckedAt.toISOString() : null,
    ...inspection,

    // Review aggregate.
    rating: reviews.reviewAverage,
    ratingAverage: reviews.reviewAverage,
    ratingCount: reviews.reviewCount,
  }
}

/**
 * Pagination envelope returned alongside a page of results.
 *
 * Always present so the frontend never has to guess whether the server paginated.
 */
export function presentPagination({ page, pageSize, total }) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  }
}
