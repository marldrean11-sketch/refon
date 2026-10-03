import { apiRequest } from '../../lib/api-client.js'

export function getMyFavoritesRequest() {
  return apiRequest('/favorites/mine')
}

export function saveFavoriteRequest(listingId) {
  return apiRequest(`/favorites/${listingId}`, { method: 'PUT' })
}

export function removeFavoriteRequest(listingId) {
  return apiRequest(`/favorites/${listingId}`, { method: 'DELETE' })
}
