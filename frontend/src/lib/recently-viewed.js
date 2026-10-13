const KEY = 'refon:recently-viewed'
const MAX = 8

/** The phones this browser viewed most recently, newest first. */
export function readRecentlyViewed() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Keeps just what a small card needs, so nothing stale or private is stored. */
export function rememberViewed(listing) {
  if (!listing?.id) return
  const entry = {
    id: listing.id,
    slug: listing.slug ?? null,
    brand: listing.brand,
    model: listing.model,
    storage: listing.storage,
    grade: listing.grade ?? null,
    price: listing.price,
    photo: listing.mainPhoto ?? listing.photos?.[0] ?? null,
    status: listing.status,
  }
  try {
    const next = [entry, ...readRecentlyViewed().filter((item) => item.id !== listing.id)].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the strip simply stays empty.
  }
}
