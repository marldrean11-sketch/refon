import { apiRequest } from '../../lib/api-client.js'

// Distinct from the seller inbox call in ./inquiry-api.js, which reads
// /inquiries/mine for listings a seller owns.
export function getMySentInquiriesRequest() {
  return apiRequest('/my-inquiries')
}

export function replyToMyInquiryRequest(id, body) {
  return apiRequest(`/my-inquiries/${id}/replies`, { method: 'POST', body: { body } })
}
