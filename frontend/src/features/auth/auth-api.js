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

export function forgotPasswordRequest(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

export function resetPasswordRequest({ token, password }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  })
}

export function verifyEmailRequest(token) {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: { token },
  })
}

export function resendVerificationRequest() {
  return apiRequest('/auth/resend-verification', { method: 'POST' })
}

export function demoLoginRequest(role) {
  return apiRequest('/auth/demo-login', {
    method: 'POST',
    body: { role },
  })
}
