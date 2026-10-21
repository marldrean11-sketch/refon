import { apiRequest } from '../../lib/api-client.js'

/**
 * Public seller storefront API.
 *
 * Read-only and unauthenticated, so nothing here sends a session and nothing here
 * can fail with a 401. The seller id is always path-encoded: a storefront URL is
 * pasteable, and an id that reached the query string by accident would be a
 * request about a different seller than the URL names.
 */

function toQueryString(params = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getSellerStorefrontRequest(sellerId, signal) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}`, { signal })
}

export function getSellerStorefrontListingsRequest(sellerId, params, signal) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}/listings${toQueryString(params)}`, {
    signal,
  })
}

export function getSellerStorefrontReviewsRequest(sellerId, params, signal) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}/reviews${toQueryString(params)}`, {
    signal,
  })
}
/** The "Phone Stores" directory. Sends the session so `following` is filled in. */
export function getStoreDirectoryRequest(params, signal) {
  return apiRequest(`/sellers${toQueryString(params)}`, { signal })
}

export function getFollowStateRequest(sellerId, signal) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}/follow`, { signal })
}

export function followStoreRequest(sellerId) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}/follow`, { method: 'POST' })
}

export function unfollowStoreRequest(sellerId) {
  return apiRequest(`/sellers/${encodeURIComponent(sellerId)}/follow`, { method: 'DELETE' })
}
