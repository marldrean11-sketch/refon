import { apiRequest } from '../../lib/api-client.js'

export function getMyInquiriesRequest(params = {}) {
  const search = new URLSearchParams()

  if (params.status) {
    search.set('status', params.status)
  }

  if (params.listingId) {
    search.set('listingId', params.listingId)
  }

  const query = search.toString()
  return apiRequest(`/inquiries/mine${query ? `?${query}` : ''}`)
}

export function markInquiryReadRequest(id) {
  return apiRequest(`/inquiries/${id}/read`, { method: 'PATCH' })
}

export function markAllInquiriesReadRequest() {
  return apiRequest('/inquiries/read-all', { method: 'PATCH' })
}
