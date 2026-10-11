import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api-client.js'

export function getHealthCheckStats(signal) {
  return apiRequest('/health-checks/stats', { signal })
}

export function recordHealthCheckRun({ completed, passed }) {
  return apiRequest('/health-checks', { method: 'POST', body: { completed, passed } })
}

/**
 * Today's count of phones checked, refreshed every 30 seconds so the number on
 * the booth screen climbs while visitors test. `null` until it first loads, and
 * stays `null` if the API is unreachable, so callers simply show nothing.
 */
export function useHealthCheckStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let controller = new AbortController()
    const load = () => {
      controller.abort()
      controller = new AbortController()
      getHealthCheckStats(controller.signal)
        .then((response) => setStats(response.stats ?? null))
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 30_000)
    const onRecorded = (event) => setStats(event.detail)
    window.addEventListener('refon:health-stats', onRecorded)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('refon:health-stats', onRecorded)
    }
  }, [])

  return stats
}

/** "42 phones checked today", or an invitation when nobody has yet. */
export function checkedTodayLabel(stats) {
  if (!stats) return null
  if (stats.today === 0) return 'Be the first phone checked today'
  return `${stats.today} ${stats.today === 1 ? 'phone' : 'phones'} checked today`
}
