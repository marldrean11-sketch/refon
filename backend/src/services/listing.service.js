import { prisma } from '../config/prisma.js'
import { storage } from './storage.service.js'
import { ApiError } from '../utils/api-error.js'
import { presentListing, presentPagination } from '../utils/listing-presenter.js'
import { RAM_GB, STORAGE_GB, categoryWhere } from '../utils/catalog-taxonomy.js'

/**
 * Shape fetched for a presented listing.
 *
 * Kept narrow on purpose: the public catalog must not carry seller contact
 * details, moderation notes beyond the listing's own feedback, or review bodies.
 * Only the review rating and count are needed for the aggregate.
 */
export const listingInclude = {
  seller: {
    select: {
      id: true,
      businessName: true,
      verificationStatus: true,
      createdAt: true,
      city: true,
      region: true,
      tagline: true,
      logoUrl: true,
      brandColor: true,
      ratingAverage: true,
      ratingCount: true,
      completedSales: true,
      _count: {
        select: {
          listings: { where: { status: 'SOLD' } },
        },
      },
    },
  },
  reviews: {
    where: { status: 'PUBLISHED', isSample: false },
    select: { rating: true },
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
      await storage.remove(filename)
    } catch (error) {
      console.warn(`Could not remove orphaned upload ${filename}:`, error.message)
    }
  }
}

/** Normalises an optional free-text field to `null` when blank. */
function optionalText(value) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Builds the canonical URL slug.
 *
 * Format is `<brand>-<model>-<storage>[-<colour>]`. The colour segment keeps two
 * listings of the same phone distinguishable once several sellers list it, which
 * is the normal case on a marketplace.
 */
export function buildListingSlug({ brand, model, storage, color }) {
  const segment = (value) =>
    String(value ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const parts = [segment(brand), segment(model), segment(storage), segment(color)]
    .filter(Boolean)
    .filter((part, index, all) => index === 0 || part !== all[index - 1])

  return parts.slice(0, 4).join('-').slice(0, 180)
}

/**
 * Returns a slug not already taken. Appends a short numeric suffix on collision
 * rather than failing the create, because a seller re-listing the same phone in
 * the same colour is legitimate.
 */
async function uniqueSlug(baseSlug, excludeId = null) {
  let candidate = baseSlug

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const existing = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing || existing.id === excludeId) {
      return candidate
    }

    candidate = `${baseSlug.slice(0, 170)}-${attempt + 2}`
  }

  return `${baseSlug.slice(0, 160)}-${Date.now().toString(36)}`
}

async function resolveSlug(values, excludeId = null) {
  if (values.slug) {
    return values.slug
  }

  return uniqueSlug(
    buildListingSlug({
      brand: values.brand,
      model: values.model,
      storage: values.storage,
      color: values.color,
    }),
    excludeId,
  )
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

  // A reference price at or below the selling price would render a fake
  // discount, so it is dropped rather than stored.
  const originalPrice =
    values.originalPrice != null && values.originalPrice > values.price
      ? values.originalPrice
      : null

  // Denormalised so the catalog can sort by saving percentage in the database.
  const discountPercent =
    originalPrice && originalPrice > 0
      ? Math.min(
          100,
          Math.max(0, Math.round(((originalPrice - values.price) / originalPrice) * 100)),
        )
      : 0

  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: values.year,
    price: values.price,
    originalPrice,
    discountPercent,
    batteryPercent: values.batteryPercent,
    storage: values.storage.trim(),
    cosmeticCondition: values.condition,
    // Absent grade stays null and is resolved from the legacy label on read,
    // rather than being guessed at write time.
    conditionGrade: values.conditionGrade ?? null,
    warrantyMonths: values.warrantyMonths ?? 0,
    color: optionalText(values.color),
    conditionNotes: values.conditionNotes.trim(),
    ram: optionalText(values.ram),
    operatingSystem: optionalText(values.operatingSystem),
    networkType: optionalText(values.networkType),
    processor: optionalText(values.processor),
    displaySpec: optionalText(values.displaySpec),
    cameraSpec: optionalText(values.cameraSpec),
    categoryTags: values.categoryTags ?? [],
    inspectionChecks: values.inspectionChecks ?? [],
    imeiVerified: values.imeiVerified ?? false,
    imeiLast4: values.imeiLast4 ? values.imeiLast4 : null,
    quantity: values.quantity ?? 1,
    isFeatured: values.isFeatured ?? false,
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
  const data = listingData(values)
  const slug = await resolveSlug({ ...values, color: data.color })

  const listing = await prisma.listing.create({
    data: {
      ...data,
      slug,
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

  const data = listingData(values)
  const slug = await resolveSlug({ ...values, color: data.color }, listing.id)

  const updatedListing = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...data,
      slug,
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

/**
 * Builds the Prisma `where` clause for a catalog query.
 *
 * Every supported filter contributes an explicit predicate. Anything not
 * supported is rejected by the validator rather than dropped here, so a shopper
 * never receives unfiltered results while believing a filter was applied.
 */
function catalogWhere(filters) {
  const and = []
  const where = { status: 'APPROVED' }

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

  if (filters.conditionGrade) {
    and.push({ conditionGrade: filters.conditionGrade })
  }

  if (Number.isInteger(filters.minBattery) || Number.isInteger(filters.maxBattery)) {
    and.push({
      batteryPercent: {
        ...(Number.isInteger(filters.minBattery) ? { gte: filters.minBattery } : {}),
        ...(Number.isInteger(filters.maxBattery) ? { lte: filters.maxBattery } : {}),
      },
    })
  }

  // Storage and RAM are free text in the database ("128 GB", "8 GB"), so a
  // range is built from the numeric gigabyte bounds of the selected values.
  const storageGb = (filters.storage ?? [])
    .map((entry) => STORAGE_GB[entry])
    .filter((value) => Number.isFinite(value))

  if (storageGb.length > 0) {
    and.push({
      storage: { in: [...new Set(storageGb.map((gb) => `${gb} GB`))] },
    })
  }

  const ramGb = (filters.ram ?? [])
    .map((entry) => RAM_GB[entry])
    .filter((value) => Number.isFinite(value))

  if (ramGb.length > 0) {
    and.push({ ram: { in: [...new Set(filters.ram)] } })
  }

  if (Number.isInteger(filters.minWarrantyMonths)) {
    and.push({ warrantyMonths: { gte: filters.minWarrantyMonths } })
  }

  if (Array.isArray(filters.warrantyMonths) && filters.warrantyMonths.length > 0) {
    and.push({
      warrantyMonths: {
        in: filters.warrantyMonths.map((value) => Number(value)).filter(Number.isFinite),
      },
    })
  }

  if (Array.isArray(filters.category) && filters.category.length > 0) {
    const categoryFilter = categoryWhere(filters.category)
    if (categoryFilter) {
      and.push(categoryFilter)
    }
  }

  if (Number.isFinite(filters.minSellerRating)) {
    and.push({
      seller: {
        ratingCount: { gt: 0 },
        ratingAverage: { gte: filters.minSellerRating },
      },
    })
  }

  if (filters.featured === true) {
    and.push({ isFeatured: true })
  }

  if (filters.search ?? filters.q) {
    and.push(searchWhere(filters.search ?? filters.q))
  }

  if (and.length > 0) {
    where.AND = and
  }

  return where
}

/**
 * Full-text predicate for a free-text catalog search.
 *
 * The query is split on whitespace and every token must match at least one
 * searchable field. Matching each field independently against the whole string
 * looks equivalent but is not: "Samsung Galaxy S8" contains neither "Samsung"
 * nor "Galaxy S8" within a single column, because the brand and the model live
 * in separate columns. That made the search suggest "Samsung Galaxy S8" and
 * then return nothing for it — a dead end the shopper could not diagnose.
 *
 * Tokenising also makes partial queries behave the way people expect:
 * "samsung s8" and "Samsung Galaxy S8" both find the phone.
 */
function searchWhere(term) {
  const tokens = String(term)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)

  if (tokens.length === 0) {
    return { id: '__no_match__' }
  }

  const searchable = (value) => ({ contains: value, mode: 'insensitive' })

  return {
    AND: tokens.map((token) => ({
      OR: [
        { brand: searchable(token) },
        { model: searchable(token) },
        { slug: searchable(token) },
        { processor: searchable(token) },
        { storage: searchable(token) },
        { ram: searchable(token) },
        { operatingSystem: searchable(token) },
      ],
    })),
  }
}

/**
 * Order-by for each sort option.
 *
 * `recommended` leads with curated listings, then best-rated, then newest, and
 * always ends with `id` so ordering is total. Without a final tiebreaker, rows
 * with equal keys can move between pages and a shopper paging through results
 * would see one listing twice and another not at all.
 */
function catalogOrderBy(sort) {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'asc' }]
    case 'price-asc':
      return [{ price: 'asc' }, { id: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }, { id: 'asc' }]
    case 'best-rated':
      return [
        { reviews: { _count: 'desc' } },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
        { id: 'asc' },
      ]
    case 'best-selling':
      return [
        { seller: { completedSales: 'desc' } },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
        { id: 'asc' },
      ]
    case 'biggest-discount':
      // `discount_percent` is the saving as a proportion of the reference price.
      // Listings with no genuine reference price hold 0 and sort last, rather than
      // being treated as a 100% discount.
      return [{ discountPercent: 'desc' }, { price: 'asc' }, { id: 'asc' }]
    case 'recommended':
    default:
      return [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }]
  }
}

/** Distinct brand facet for the filter sidebar. */
async function getBrandFacet() {
  const rows = await prisma.listing.findMany({
    where: { status: 'APPROVED' },
    distinct: ['brand'],
    select: { brand: true },
    orderBy: { brand: 'asc' },
  })

  return rows.map((row) => row.brand)
}

export async function getApprovedListings(filters = {}) {
  const where = catalogWhere(filters)
  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1
  const pageSize =
    Number.isInteger(filters.pageSize) && filters.pageSize > 0 ? filters.pageSize : 12

  const [listings, total, brands] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: catalogOrderBy(filters.sort),
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: listingInclude,
    }),
    prisma.listing.count({ where }),
    getBrandFacet(),
  ])

  return {
    listings: listings.map(presentListing),
    brands,
    pagination: presentPagination({ page, pageSize, total }),
  }
}

/**
 * Facets for the filter sidebar: brands plus the storage, RAM, and warranty
 * values actually present in the catalog, so the sidebar never offers a filter
 * that returns nothing.
 */
export async function getCatalogFacets() {
  const rows = await prisma.listing.findMany({
    where: { status: 'APPROVED' },
    select: {
      brand: true,
      storage: true,
      ram: true,
      conditionGrade: true,
      warrantyMonths: true,
    },
  })

  const tally = (key) => {
    const counts = new Map()
    for (const row of rows) {
      const value = row[key]
      if (value == null || value === '') continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((left, right) => {
        const leftNumber = Number.parseFloat(left[0])
        const rightNumber = Number.parseFloat(right[0])
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
          return leftNumber - rightNumber
        }
        return String(left[0]).localeCompare(String(right[0]))
      })
      .map(([value, count]) => ({ value, count }))
  }

  return {
    brands: tally('brand'),
    storages: tally('storage'),
    rams: tally('ram'),
    grades: tally('conditionGrade'),
    warranties: tally('warrantyMonths'),
  }
}

/**
 * Typeahead suggestions.
 *
 * Reads real catalog data only — distinct models and brands that exist and are
 * approved — so a suggestion never leads to an empty result page.
 */
export async function getCatalogSuggestions(search) {
  const term = String(search ?? '').trim()

  if (term.length < 1) {
    return { suggestions: [], popular: await getPopularSearches() }
  }

  // The same tokenised predicate the results endpoint uses, so a suggestion can
  // never be offered for a query that would come back empty.
  const rows = await prisma.listing.findMany({
    where: { status: 'APPROVED', ...searchWhere(term) },
    select: {
      brand: true,
      model: true,
      storage: true,
      color: true,
      slug: true,
      conditionGrade: true,
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
  })

  // Grouped by model so "iphone 13" offers iPhone 13 variants rather than the
  // same model repeated for every storage and colour.
  const byModel = new Map()

  for (const row of rows) {
    const key = `${row.brand} ${row.model}`.toLowerCase()

    if (byModel.has(key)) {
      byModel.get(key).variants += 1
      continue
    }

    byModel.set(key, {
      type: 'model',
      label: `${row.brand} ${row.model}`,
      // The query is the brand and model together, which is exactly what the
      // results endpoint tokenises back into brand + model.
      query: `${row.brand} ${row.model}`,
      grade: row.conditionGrade ?? null,
      variants: 1,
    })
  }

  const suggestions = [...byModel.values()].slice(0, 6)

  return { suggestions, popular: await getPopularSearches() }
}

/** Models with the most approved inventory, used as "popular searches". */
export async function getPopularSearches(limit = 6) {
  const rows = await prisma.listing.findMany({
    where: { status: 'APPROVED' },
    select: { brand: true, model: true },
    take: 500,
    orderBy: { createdAt: 'desc' },
  })

  const counts = new Map()

  for (const row of rows) {
    const key = `${row.brand} ${row.model}`.toLowerCase()
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, { label: `${row.brand} ${row.model}`, query: key, count: 1 })
    }
  }

  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, limit)
}

/** The product page also says how many shoppers saved the phone. */
async function withSaveCount(listing) {
  const saveCount = await prisma.favorite.count({ where: { listingId: listing.id } })
  return { ...presentListing(listing), saveCount }
}

export async function getApprovedListing(id) {
  const listing = await prisma.listing.findFirst({
    where: { id, status: { in: ['APPROVED', 'SOLD'] } },
    include: listingInclude,
  })

  if (!listing) {
    throw new ApiError(404, 'Approved listing not found.', 'LISTING_NOT_FOUND')
  }

  return withSaveCount(listing)
}

/**
 * Canonical product lookup by slug.
 *
 * SOLD listings remain resolvable so a shared product URL keeps working after
 * the phone sells, matching the id-based behaviour.
 */
export async function getApprovedListingBySlug(slug) {
  const listing = await prisma.listing.findFirst({
    where: { slug, status: { in: ['APPROVED', 'SOLD'] } },
    include: listingInclude,
  })

  if (!listing) {
    throw new ApiError(404, 'Approved listing not found.', 'LISTING_NOT_FOUND')
  }

  return withSaveCount(listing)
}

/**
 * Listings related to the given one: same brand first, then the same price band
 * across other brands, so the rail suggests either an alternative of the same
 * model or a comparable phone.
 */
export async function getRelatedListings(id, limit = 6) {
  const listing = await prisma.listing.findFirst({
    where: { id, status: 'APPROVED' },
    select: { id: true, brand: true, price: true },
  })

  if (!listing) {
    return []
  }

  const price = Number(listing.price)
  const priceBand = Math.max(1500, Math.round(price * 0.15))

  const rows = await prisma.listing.findMany({
    where: {
      status: 'APPROVED',
      id: { not: listing.id },
      OR: [
        { brand: { equals: listing.brand, mode: 'insensitive' } },
        { price: { gte: price - priceBand, lte: price + priceBand } },
      ],
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    take: limit,
    include: listingInclude,
  })

  return rows.map(presentListing)
}

/**
 * Attribution label for a review author.
 *
 * Reviews are attributed by initials only. Publishing a full name or email would
 * tie a real account identity to a public page for no benefit to a buyer
 * evaluating a phone, and the marketplace does not need to identify anyone to be
 * credible. Falling back to a positional label keeps every review renderable even
 * if an author record is ever missing a name.
 */
export function reviewAuthorLabel(name, index) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return `Buyer ${index + 1}`
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Published reviews for a listing, plus the rating distribution.
 *
 * Read-only. Writing reviews requires the order and delivery records, which is a
 * later phase, so there is deliberately no create, update, or delete path here —
 * only the `PUBLISHED` rows the seed or a future order flow inserts.
 *
 * Only PUBLISHED reviews are selected at the query level rather than filtered in
 * application code, so a PENDING or REJECTED review can never be leaked by a
 * missed condition.
 */
export async function getListingReviews(id) {
  const listing = await prisma.listing.findFirst({
    where: { id, status: { in: ['APPROVED', 'SOLD'] } },
    select: { id: true },
  })

  if (!listing) {
    throw new ApiError(404, 'Approved listing not found.', 'LISTING_NOT_FOUND')
  }

  const rows = await prisma.review.findMany({
    where: { listingId: id, status: 'PUBLISHED', isSample: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      conditionRating: true,
      sellerRating: true,
      verifiedPurchase: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })

  const reviews = rows.map((row, index) => ({
    id: row.id,
    rating: row.rating,
    title: row.title ?? null,
    comment: row.comment,
    conditionRating: row.conditionRating ?? null,
    sellerRating: row.sellerRating ?? null,
    // The badge is driven purely by the stored flag. It is never inferred from
    // rating or comment text.
    verifiedPurchase: row.verifiedPurchase === true,
    author: reviewAuthorLabel(row.user?.name, index),
    createdAt: toIso(row.createdAt),
  }))

  const total = reviews.reduce((sum, review) => sum + review.rating, 0)

  return {
    reviews,
    summary: {
      count: reviews.length,
      average: reviews.length > 0 ? Number((total / reviews.length).toFixed(2)) : null,
      // Every star band is present, including the zero ones, so the breakdown can
      // render five bars without inventing rows.
      breakdown: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: reviews.filter((review) => review.rating === stars).length,
      })),
    },
  }
}

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

/**
 * Lowers the price of a live listing and tells everyone who saved it.
 *
 * Only a lower price is accepted: that never needs a second moderation round,
 * because it can only help buyers. Raising a price or changing anything else
 * still goes through editing and review. A stored reference price stays only
 * while it is still above the new price, so the discount shown stays genuine.
 */
export async function lowerListingPrice(id, userId, newPrice) {
  return prisma.$transaction(async (transaction) => {
    const listing = await transaction.listing.findFirst({
      where: { id, seller: { userId } },
      select: {
        id: true,
        status: true,
        brand: true,
        model: true,
        storage: true,
        price: true,
        originalPrice: true,
        seller: { select: { userId: true } },
      },
    })

    if (!listing) {
      throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
    }

    if (listing.status !== 'APPROVED') {
      throw new ApiError(
        409,
        'Only live listings can get a price drop. Edit a pending listing instead.',
        'LISTING_NOT_APPROVED',
      )
    }

    const oldPrice = Number(listing.price)
    if (!(newPrice < oldPrice)) {
      throw new ApiError(
        422,
        'The new price must be lower than the current price.',
        'PRICE_NOT_LOWER',
      )
    }

    const reference = listing.originalPrice != null ? Number(listing.originalPrice) : null
    const originalPrice = reference != null && reference > newPrice ? reference : null
    const discountPercent = originalPrice
      ? Math.min(100, Math.max(0, Math.round(((originalPrice - newPrice) / originalPrice) * 100)))
      : 0

    const updatedListing = await transaction.listing.update({
      where: { id: listing.id },
      data: { price: newPrice, originalPrice, discountPercent },
      include: listingInclude,
    })

    const savers = await transaction.favorite.findMany({
      where: { listingId: listing.id, userId: { not: listing.seller.userId } },
      select: { userId: true },
    })

    if (savers.length > 0) {
      const name = `${listing.brand} ${listing.model} ${listing.storage}`.trim()
      await transaction.notification.createMany({
        data: savers.map((saver) => ({
          userId: saver.userId,
          type: 'PRICE_DROP',
          message: `Price drop! The ${name} you saved is now ${pesoFormatter.format(newPrice)} (was ${pesoFormatter.format(oldPrice)}).`,
          relatedListingId: listing.id,
        })),
      })
    }

    return { listing: presentListing(updatedListing), notified: savers.length }
  })
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
