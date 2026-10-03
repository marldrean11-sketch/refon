import { apiRequest } from '../../lib/api-client.js'

export function registerRequest(credentials) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: credentials,
  })
}

export function loginRequest(credentials) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export function meRequest() {
  return apiRequest('/auth/me')
}

export function logoutRequest() {
  return apiRequest('/auth/logout', { method: 'POST' })
}
