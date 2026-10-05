/**
 * Category definitions.
 *
 * Each category maps to a query `GET /api/listings` accepts, so a category card is
 * a shareable URL that returns real results rather than a client-side filter that
 * cannot be linked.
 *
 * `illustration*` fields pick the model rendered on a category card. They are
 * representative of the category rather than a claim about current inventory.
 */
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

export const CATEGORIES = Object.freeze([
  {
    slug: 'iphone',
    name: 'iPhone',
    description: 'Apple devices with long iOS support and strong resale value.',
    query: { brand: 'Apple' },
    badge: 'Verified Apple devices',
    illustrationBrand: 'Apple',
    illustrationModel: 'iPhone 13 Pro',
    illustrationColor: 'Midnight',
  },
  {
    slug: 'samsung-galaxy',
    name: 'Samsung Galaxy',
    description: 'The widest range on ReFon, from A-series to S-series flagships.',
    query: { brand: 'Samsung' },
    badge: 'Most listed brand',
    illustrationBrand: 'Samsung',
    illustrationModel: 'Galaxy S23',
    illustrationColor: 'Phantom Black',
  },
  {
    slug: 'google-pixel',
    name: 'Google Pixel',
    description: 'Clean Android, excellent cameras, guaranteed updates.',
    query: { brand: 'Google' },
    badge: 'Clean Android experience',
    illustrationBrand: 'Google',
    illustrationModel: 'Pixel 8',
    illustrationColor: 'Onyx',
  },
  {
    slug: 'xiaomi',
    name: 'Xiaomi',
    description: 'Strong specifications per peso, with large batteries throughout.',
    query: { brand: 'Xiaomi' },
    badge: 'Best value per peso',
    illustrationBrand: 'Xiaomi',
    illustrationModel: 'Redmi Note 12',
    illustrationColor: 'Onyx Black',
  },
  {
    slug: 'oppo',
    name: 'Oppo',
    description: 'Slim designs, capable cameras, and dependable build quality.',
    query: { brand: 'Oppo' },
    badge: 'Design-led devices',
    illustrationBrand: 'Oppo',
    illustrationModel: 'Reno 8',
    illustrationColor: 'Celestial Black',
  },
  {
    slug: 'vivo',
    name: 'Vivo',
    description: 'Photography-focused phones with generous storage options.',
    query: { brand: 'Vivo' },
    badge: 'Camera focused',
    illustrationBrand: 'Vivo',
    illustrationModel: 'V29',
    illustrationColor: 'Blue',
  },
  {
    slug: 'oneplus',
    name: 'OnePlus',
    description: 'Flagship performance and smooth displays at midrange prices.',
    query: { brand: 'OnePlus' },
    badge: 'Performance oriented',
    illustrationBrand: 'OnePlus',
    illustrationModel: 'OnePlus 11',
    illustrationColor: 'Green',
  },
  {
    slug: 'gaming-phones',
    name: 'Gaming Phones',
    description: 'High refresh rate displays and cooling built for long sessions.',
    query: { category: 'gaming-phones' },
    badge: '120Hz and above',
    illustrationBrand: 'Xiaomi',
    illustrationModel: 'POCO X5 Pro',
    illustrationColor: 'Yellow',
  },
  {
    slug: 'budget-phones',
    name: 'Budget Phones',
    description: 'Reliable everyday devices for under ₱8,000.',
    query: { maxPrice: '8000' },
    badge: 'Everyday essentials',
    illustrationBrand: 'Xiaomi',
    illustrationModel: 'Redmi Note 9',
    illustrationColor: 'Midnight Black',
  },
  {
    slug: 'under-10000',
    name: 'Under ₱10,000',
    description: 'Tested phones that fit a student budget without cutting corners.',
    query: { maxPrice: '10000' },
    badge: 'Student friendly',
    illustrationBrand: 'Samsung',
    illustrationModel: 'Galaxy A34',
    illustrationColor: 'Awesome Iceblue',
  },
  {
    slug: 'under-20000',
    name: 'Under ₱20,000',
    description: 'Flagship-class hardware that most people cannot justify buying new.',
    query: { maxPrice: '20000' },
    badge: 'Midrange sweet spot',
    illustrationBrand: 'Apple',
    illustrationModel: 'iPhone 12',
    illustrationColor: 'Blue',
  },
  {
    slug: 'flagship-phones',
    name: 'Flagship Phones',
    description: 'Top-tier processors, displays, and cameras at a fraction of new price.',
    query: { minPrice: '25000' },
    badge: 'Premium tier',
    illustrationBrand: 'Samsung',
    illustrationModel: 'Galaxy S22 Ultra',
    illustrationColor: 'Burgundy',
  },
  {
    slug: 'premium-refurbished',
    name: 'Premium Refurbished',
    description: 'Grade A flagship devices with the highest battery health on ReFon.',
    query: { conditionGrade: 'A' },
    badge: 'Grade A only',
    illustrationBrand: 'Apple',
    illustrationModel: 'iPhone 14 Pro',
    illustrationColor: 'Space Gray',
  },
])

export function getCategory(slug) {
  return CATEGORIES.find((category) => category.slug === slug) ?? null
}

/** Builds the shop URL for a category from its query. */
export function categoryQueryString(query = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  return params.toString()
}

/**
 * Shop href for a category.
 *
 * Every category query below is a parameter `GET /api/listings` accepts, so a
 * category card always lands on real results. Price-band categories become
 * `maxPrice`, the grade category becomes `conditionGrade`, and tag categories
 * become `category`.
 */
export function categoryHref(category) {
  const queryString = categoryQueryString(category.query)

  return queryString ? `${MARKETPLACE_ROUTES.shop}?${queryString}` : MARKETPLACE_ROUTES.shop
}
