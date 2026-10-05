import { apiRequest } from '../../lib/api-client.js'

/**
 * Catalog filter state, serialised to and from the URL query string.
 *
 * Filtered shop URLs must be shareable and must survive a refresh and the
 * back button, so the URL is the single source of truth rather than React state
 * that happens to mirror it. Two arrays are flattened to comma-separated values
 * because a repeated query parameter (`storage=a&storage=b`) is easy to reorder
 * in the address bar, which would make the same set of filters produce
 * different URLs.
 */

/** Filters that reset to the first page whenever they change. */
export const DEFAULT_FILTERS = Object.freeze({
  search: '',
  brand: '',
  conditionGrade: '',
  minPrice: '',
  maxPrice: '',
  minBattery: '',
  storage: [],
  ram: [],
  warrantyMonths: [],
  category: [],
  minSellerRating: '',
  sort: 'recommended',
  page: 1,
})

const ARRAY_FILTERS = ['storage', 'ram', 'warrantyMonths', 'category']

const STRING_FILTERS = [
  'search',
  'brand',
  'conditionGrade',
  'minPrice',
  'maxPrice',
  'minBattery',
  'minSellerRating',
  'sort',
]

/** Human labels for the removable filter chips above the results grid. */
export const FILTER_LABELS = Object.freeze({
  search: 'Search',
  brand: 'Brand',
  conditionGrade: 'Condition',
  minPrice: 'Min price',
  maxPrice: 'Max price',
  minBattery: 'Battery',
  storage: 'Storage',
  ram: 'RAM',
  warrantyMonths: 'Warranty',
  category: 'Category',
  minSellerRating: 'Seller rating',
})

const GRADE_LABELS = { A: 'Grade A', B: 'Grade B', C: 'Grade C' }

const CATEGORY_LABELS = {
  iphone: 'iPhone',
  'samsung-galaxy': 'Samsung Galaxy',
  'google-pixel': 'Google Pixel',
  xiaomi: 'Xiaomi',
  oppo: 'Oppo',
  vivo: 'Vivo',
  oneplus: 'OnePlus',
  'gaming-phones': 'Gaming phones',
  'budget-phones': 'Budget phones',
  'under-10000': 'Under ₱10,000',
  'under-20000': 'Under ₱20,000',
  'flagship-phones': 'Flagship phones',
  'premium-refurbished': 'Premium refurbished',
}

export function labelForFilter(key, value) {
  if (key === 'conditionGrade') {
    return GRADE_LABELS[value] ?? value
  }

  if (key === 'category') {
    return CATEGORY_LABELS[value] ?? value
  }

  if (key === 'minSellerRating') {
    return `${value}★ and up`
  }

  if (key === 'minBattery') {
    return `${value}%+`
  }

  if (key === 'minPrice' || key === 'maxPrice') {
    return `₱${Number(value).toLocaleString('en-PH')}`
  }

  if (key === 'warrantyMonths') {
    return `${value} months`
  }

  return String(value)
}

/** Reads filter state out of a `URLSearchParams`. */
export function parseFilters(searchParams) {
  const filters = { ...DEFAULT_FILTERS }

  for (const key of STRING_FILTERS) {
    const value = searchParams.get(key)
    if (value) {
      filters[key] = value
    }
  }

  for (const key of ARRAY_FILTERS) {
    const value = searchParams.get(key)
    filters[key] = value ? value.split(',').filter(Boolean) : []
  }

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  filters.page = Number.isFinite(page) && page > 0 ? page : 1

  if (filters.sort !== 'recommended') {
    filters.sort = filters.sort || 'recommended'
  }

  return filters
}

/**
 * Writes filter state into a `URLSearchParams`, omitting defaults so an
 * unfiltered shop URL stays clean and short.
 */
export function serialiseFilters(filters) {
  const params = new URLSearchParams()

  for (const key of STRING_FILTERS) {
    const value = filters[key]
    if (!value) continue
    if (key === 'sort' && value === DEFAULT_FILTERS.sort) continue
    params.set(key, String(value))
  }

  for (const key of ARRAY_FILTERS) {
    const value = filters[key]
    if (Array.isArray(value) && value.length > 0) {
      // Sorted so two equivalent filter sets always produce the same URL.
      params.set(key, [...value].map(String).sort().join(','))
    }
  }

  if (filters.page > 1) {
    params.set('page', String(filters.page))
  }

  return params
}

/** Query object for `GET /api/listings`, omitting empty filters. */
export function toApiQuery(filters) {
  const params = serialiseFilters(filters)
  params.delete('page')
  return Object.fromEntries(params.entries())
}

/** Lists the active filters as removable chips. */
export function activeFilterChips(filters) {
  const chips = []

  for (const key of STRING_FILTERS) {
    if (key === 'sort') continue
    if (filters[key]) {
      chips.push({ key, value: filters[key], label: labelForFilter(key, filters[key]) })
    }
  }

  for (const key of ARRAY_FILTERS) {
    for (const value of filters[key] ?? []) {
      chips.push({ key, value, label: labelForFilter(key, value) })
    }
  }

  return chips
}

export function countActiveFilters(filters) {
  return activeFilterChips(filters).length
}

export function hasAnyFilter(filters) {
  return countActiveFilters(filters) > 0
}

/** Removes one filter, always returning to page 1. */
export function removeFilter(filters, key, value) {
  const next = { ...filters }

  if (ARRAY_FILTERS.includes(key)) {
    next[key] = (filters[key] ?? []).filter((entry) => String(entry) !== String(value))
  } else {
    next[key] = ''
  }

  next.page = 1
  return next
}

/** Applies a patch, resetting to page 1 unless the patch is a page change. */
export function applyPatch(filters, patch) {
  const next = { ...filters, ...patch }

  if (!('page' in patch)) {
    next.page = 1
  }

  return next
}

/** Toggles a value inside a multi-select filter. */
export function toggleArrayFilter(filters, key, value) {
  const current = filters[key] ?? []
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value]

  return applyPatch(filters, { [key]: next })
}

export function clearFilters() {
  return { ...DEFAULT_FILTERS }
}
