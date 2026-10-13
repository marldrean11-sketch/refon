import { apiRequest } from '../../lib/api-client.js'

export function getMyOrdersRequest() {
  return apiRequest('/orders/mine')
}

export function getMyOrderRequest(orderNumber) {
  return apiRequest(`/orders/mine/${encodeURIComponent(orderNumber)}`)
}

export function cancelMyOrderRequest(orderNumber, reason = '') {
  return apiRequest(`/orders/mine/${encodeURIComponent(orderNumber)}/cancel`, {
    method: 'PATCH',
    body: reason ? { reason } : {},
  })
}

export function getSellerOrdersRequest(status = '') {
  return apiRequest(`/orders/seller${status ? `?status=${status}` : ''}`)
}

export function updateSellerOrderStatusRequest(id, status, reason = '') {
  return apiRequest(`/orders/seller/${id}/status`, {
    method: 'PATCH',
    body: reason ? { status, reason } : { status },
  })
}

export function getAdminOrdersRequest(status = '') {
  return apiRequest(`/admin/orders${status ? `?status=${status}` : ''}`)
}
