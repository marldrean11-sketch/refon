import { apiRequest } from '../../lib/api-client.js'

export function createTradeInRequest(values) {
  return apiRequest('/trade-ins', { method: 'POST', body: values })
}
