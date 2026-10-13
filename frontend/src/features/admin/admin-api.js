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

export function getSellerDirectoryRequest({ status = '', q = '' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q.trim()) params.set('q', q.trim())
  const query = params.toString()
  return apiRequest(`/admin/sellers${query ? `?${query}` : ''}`)
}

export function getSellerForAdminRequest(id) {
  return apiRequest(`/admin/sellers/${id}`)
}

export function getAdminListingsRequest({ status = '', q = '' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q.trim()) params.set('q', q.trim())
  const query = params.toString()
  return apiRequest(`/admin/listings${query ? `?${query}` : ''}`)
}

export function takeDownListingRequest(id, feedback) {
  return apiRequest(`/admin/listings/${id}/take-down`, {
    method: 'PATCH',
    body: { feedback },
  })
}

export function getAdminUsersRequest({ role = '', status = '', q = '' } = {}) {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  if (status) params.set('status', status)
  if (q.trim()) params.set('q', q.trim())
  const query = params.toString()
  return apiRequest(`/admin/users${query ? `?${query}` : ''}`)
}

export function suspendUserRequest(id, reason = '') {
  return apiRequest(`/admin/users/${id}/suspend`, {
    method: 'PATCH',
    body: reason.trim() ? { reason } : {},
  })
}

export function unsuspendUserRequest(id) {
  return apiRequest(`/admin/users/${id}/unsuspend`, { method: 'PATCH' })
}

export function getAdminTradeInsRequest(status = '') {
  return apiRequest(`/admin/trade-ins${status ? `?status=${status}` : ''}`)
}

export function updateTradeInRequest(id, values) {
  return apiRequest(`/admin/trade-ins/${id}`, { method: 'PATCH', body: values })
}

export function getHealthCheckCountRequest(signal) {
  return apiRequest('/admin/health-checks', { signal })
}

/** Zeroes today's "phones checked" counter, e.g. after testing the booth setup. */
export function resetHealthChecksTodayRequest() {
  return apiRequest('/admin/health-checks/today', { method: 'DELETE' })
}
