import { apiRequest } from '../../lib/api-client.js'

export function updateProfileRequest(profile) {
  return apiRequest('/account/profile', {
    method: 'PATCH',
    body: profile,
  })
}

export function changePasswordRequest(credentials) {
  return apiRequest('/account/change-password', {
    method: 'POST',
    body: credentials,
  })
}