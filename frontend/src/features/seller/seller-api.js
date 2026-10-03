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
