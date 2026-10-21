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

export function rejectSellerRequest(id, feedback = '') {
  return apiRequest(`/admin/sellers/${id}/reject`, {
    method: 'PATCH',
    body: { feedback },
  })
}

export function getReportsRequest(status = 'OPEN') {
  return apiRequest(`/admin/reports?status=${status}`)
}

export function resolveReportRequest(id, { action, note = '' }) {
  return apiRequest(`/admin/reports/${id}/resolve`, {
    method: 'PATCH',
    body: { action, note },
  })
}

export function getPendingListingsRequest() {
  return apiRequest('/admin/listings/pending')
}

/** `imeiChecked` records the moderator's IMEI and lock check with the approval. */
export function approveListingRequest(id, { imeiChecked = false } = {}) {
  return apiRequest(`/admin/listings/${id}/approve`, { method: 'PATCH', body: { imeiChecked } })
}

export function rejectListingRequest(id, feedback = '') {
  return apiRequest(`/admin/listings/${id}/reject`, {
    method: 'PATCH',
    body: { feedback },
  })
}
