import { apiRequest } from '../../lib/api-client.js'

export function applyAsSellerRequest(values) {
  return apiRequest('/sellers/apply', {
    method: 'POST',
    body: values,
  })
}

export function getMySellerProfileRequest() {
  return apiRequest('/sellers/me')
}

export function updatePaymentDetailsRequest(values) {
  return apiRequest('/sellers/me/payment', {
    method: 'PATCH',
    body: values,
  })
}
