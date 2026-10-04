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

export function approveListingRequest(id) {
  return apiRequest(`/admin/listings/${id}/approve`, { method: 'PATCH' })
}

export function rejectListingRequest(id, feedback = '') {
  return apiRequest(`/admin/listings/${id}/reject`, {
    method: 'PATCH',
    body: { feedback },
  })
}
