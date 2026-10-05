/**
 * Catalog taxonomy shared by the validators, the service layer, and the seed.
 *
 * Kept in one module so a filter the API accepts and a facet the UI offers can
 * never drift apart: both read the same lists.
 */

/** The 11 functional checks that run before a phone can be listed. */
export const INSPECTION_CHECK_IDS = Object.freeze([
  'display',
  'touchscreen',
  'camera',
  'speaker',
  'microphone',
  'charging',
  'battery',
  'wifi',
  'bluetooth',
  'buttons',
  'biometrics',
])

export const CONDITION_GRADES = Object.freeze({
  grades: [
    {
      id: 'A',
      label: 'Excellent',
      headline: 'Grade A — Excellent',
      summary: 'Minimal signs of use.',
      description:
        'Looks close to new. Light micro-marks at most, usually only visible under direct light. No dents, no cracks, clean glass and frame.',
    },
    {
      id: 'B',
      label: 'Very Good',
      headline: 'Grade B — Very Good',
      summary: 'Minor cosmetic marks.',
      description:
        'Visible light wear from normal use. Small scratches on the frame or rear panel, clean display and camera glass, everything fully functional.',
    },
    {
      id: 'C',
      label: 'Good',
      headline: 'Grade C — Good',
      summary: 'Visible signs of use, fully functional.',
      description:
        'Clear cosmetic wear such as scuffs or small marks on the back or frame. Nothing structural, no cracked glass, and every function passes testing.',
    },
  ],
  /** Maps the legacy free-text condition label onto the graded scale. */
  legacyLabels: {
    'Like New': 'A',
    Excellent: 'A',
    Mint: 'A',
    Good: 'B',
    'Very Good': 'B',
    Fair: 'C',
    Used: 'C',
  },
  inspectionCheckIds: INSPECTION_CHECK_IDS,
})

export const GRADE_LABELS = Object.freeze(
  Object.fromEntries(CONDITION_GRADES.grades.map((grade) => [grade.id, grade.label])),
)

/**
 * Sort options exposed by the catalog.
 *
 * `featured` first is the "recommended" ordering: curated listings lead, then
 * the highest-rated, then newest. It is deterministic, so paging through it does
 * not repeat or skip a listing the way a rotating score would.
 */
export const LISTING_SORTS = Object.freeze([
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'best-rated', label: 'Best Rated' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'biggest-discount', label: 'Biggest Discount' },
])

export const STORAGE_OPTIONS = Object.freeze([
  '32 GB',
  '64 GB',
  '128 GB',
  '256 GB',
  '512 GB',
  '1 TB',
])

export const RAM_OPTIONS = Object.freeze(['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'])

export const WARRANTY_OPTIONS = Object.freeze([
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
])

/**
 * Category slugs understood by the catalog filter.
 *
 * Brand and price-band categories are resolved server-side from brand and price
 * so they cannot drift from the listings. Tag-based categories (gaming, and
 * anything else a seller sets) are matched against `category_tags`.
 */
export const CATEGORY_SLUGS = Object.freeze([
  'iphone',
  'samsung-galaxy',
  'google-pixel',
  'xiaomi',
  'oppo',
  'vivo',
  'oneplus',
  'gaming-phones',
  'budget-phones',
  'under-10000',
  'under-20000',
  'flagship-phones',
  'premium-refurbished',
])

/** Brand-scoped categories resolved from `brand`. */
export const BRAND_CATEGORY_BRANDS = Object.freeze({
  iphone: 'Apple',
  'samsung-galaxy': 'Samsung',
  'google-pixel': 'Google',
  xiaomi: 'Xiaomi',
  oppo: 'Oppo',
  vivo: 'Vivo',
  oneplus: 'OnePlus',
})

/** Price-band categories resolved from `price`. */
export const PRICE_CATEGORY_BANDS = Object.freeze({
  'budget-phones': { maxPrice: 8000 },
  'under-10000': { maxPrice: 10000 },
  'under-20000': { maxPrice: 20000 },
  'flagship-phones': { minPrice: 25000 },
})

/** Grade-scoped categories resolved from `condition_grade`. */
export const GRADE_CATEGORIES = Object.freeze({
  'premium-refurbished': { grade: 'A' },
})

/**
 * Builds the Prisma filter fragment for a set of category slugs.
 *
 * Slugs combine with OR, because a shopper asking for "Xiaomi" and "gaming
 * phones" wants phones that are both. Unknown slugs are rejected by the
 * validator before reaching here.
 */
export function categoryWhere(slugs) {
  const clauses = []

  for (const slug of slugs) {
    const brand = BRAND_CATEGORY_BRANDS[slug]
    if (brand) {
      clauses.push({ brand: { equals: brand, mode: 'insensitive' } })
      continue
    }

    const band = PRICE_CATEGORY_BANDS[slug]
    if (band) {
      clauses.push({
        price: {
          ...(band.minPrice != null ? { gte: band.minPrice } : {}),
          ...(band.maxPrice != null ? { lte: band.maxPrice } : {}),
        },
      })
      continue
    }

    const gradeCategory = GRADE_CATEGORIES[slug]
    if (gradeCategory) {
      clauses.push({ conditionGrade: gradeCategory.grade })
      continue
    }

    // Tag-based category, e.g. gaming phones.
    clauses.push({ categoryTags: { has: slug } })
  }

  return clauses.length > 0 ? { OR: clauses } : null
}

/** Normalises a storage string to its gigabyte count for range filtering. */
export function parseStorageGb(value) {
  const text = String(value).trim().toUpperCase()
  const match = text.match(/^([\d.]+)\s*(GB|TB)$/)

  if (!match) {
    return null
  }

  const amount = Number(match[1])
  return match[2] === 'TB' ? amount * 1024 : amount
}

/** Normalises a RAM string to its gigabyte count. */
export function parseRamGb(value) {
  const match = String(value).trim().toUpperCase().match(/^([\d.]+)\s*GB$/)

  if (!match) {
    return null
  }

  return Number(match[1])
}

/** Numeric GB for every configured storage option, for building range filters. */
export const STORAGE_GB = Object.freeze(
  Object.fromEntries(STORAGE_OPTIONS.map((entry) => [entry, parseStorageGb(entry)])),
)

/** Numeric GB for every configured RAM option. */
export const RAM_GB = Object.freeze(
  Object.fromEntries(RAM_OPTIONS.map((entry) => [entry, parseRamGb(entry)])),
)

/** The display label for a stored grade. */
export function gradeLabel(grade) {
  return GRADE_LABELS[grade] ?? null
}
