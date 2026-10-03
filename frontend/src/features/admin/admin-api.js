import { apiRequest } from '../../lib/api-client.js'

export function getAdminStatsRequest() {
  return apiRequest('/admin/stats')
}

export function getPendingSellersRequest() {
  return apiRequest('/admin/sellers/pending')
}

export function approveSellerRequest(id) {
  return apiRequest(`/admin/sellers/${id}/approve`, { method: 'PATCH' })
}

export function rejectSellerRequest(id) {
  return apiRequest(`/admin/sellers/${id}/reject`, { method: 'PATCH' })
}

export function getPendingListingsRequest() {
  return apiRequest('/admin/listings/pending')
}

export function approveListingRequest(id) {
  return apiRequest(`/admin/listings/${id}/approve`, { method: 'PATCH' })
}

export function rejectListingRequest(id, feedback = '') {
  return apiRequest(`/admin/listings/${id}/reject`, {
    method: 'PATCH',
    body: { feedback },
  })
}
