import { apiRequest } from '../../lib/api-client.js'

function toQueryString(filters = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      continue
    }

    params.set(key, String(value))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function getApprovedListingsRequest(filters, signal) {
  return apiRequest(`/listings${toQueryString(filters)}`, { signal })
}

export function getListingRequest(id, signal) {
  return apiRequest(`/listings/${id}`, { signal })
}

/** Canonical product lookup by slug. Resolves to a SOLD listing too. */
export function getListingBySlugRequest(slug, signal) {
  return apiRequest(`/listings/slug/${encodeURIComponent(slug)}`, { signal })
}

export function getRelatedListingsRequest(id, signal) {
  return apiRequest(`/listings/${id}/related`, { signal })
}

/**
 * Published reviews for a listing.
 *
 * Read-only. There is no review submission endpoint until orders and delivery
 * exist, so nothing here can create a review.
 */
export function getListingReviewsRequest(id, signal) {
  return apiRequest(`/listings/${id}/reviews`, { signal })
}

export function getMyListingsRequest() {
  return apiRequest('/listings/mine')
}

export function uploadPhotosRequest(files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('photos', file))

  return apiRequest('/uploads', {
    method: 'POST',
    body: formData,
  })
}

export function createListingRequest(values) {
  return apiRequest('/listings', {
    method: 'POST',
    body: values,
  })
}

export function updateListingRequest(id, values) {
  return apiRequest(`/listings/${id}`, {
    method: 'PUT',
    body: values,
  })
}

export function deleteListingRequest(id) {
  return apiRequest(`/listings/${id}`, { method: 'DELETE' })
}

export function markListingSoldRequest(id) {
  return apiRequest(`/listings/${id}/mark-sold`, { method: 'PATCH' })
}

export function submitInquiryRequest(listingId, values) {
  return apiRequest(`/listings/${listingId}/inquiries`, {
    method: 'POST',
    body: values,
  })
}

export function getListingInquiriesRequest(listingId) {
  return apiRequest(`/listings/${listingId}/inquiries`)
}

export function reportListingRequest(listingId, body) {
  return apiRequest(`/listings/${listingId}/reports`, {
    method: 'POST',
    body,
  })
}
