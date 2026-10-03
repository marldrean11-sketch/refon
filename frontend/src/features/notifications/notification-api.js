import { apiRequest } from '../../lib/api-client.js'

export function getMyNotificationsRequest() {
  return apiRequest('/notifications/mine')
}

export function markNotificationReadRequest(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsReadRequest() {
  return apiRequest('/notifications/read-all', { method: 'PATCH' })
}
