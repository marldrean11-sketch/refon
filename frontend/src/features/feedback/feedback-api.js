import { apiRequest } from '../../lib/api-client.js'

export function submitFeedbackRequest({ rating, wouldBuy, comment }) {
  return apiRequest('/feedback', { method: 'POST', body: { rating, wouldBuy, comment: comment || undefined } })
}

export function getFeedbackSummaryRequest(signal) {
  return apiRequest('/admin/feedback', { signal })
}
