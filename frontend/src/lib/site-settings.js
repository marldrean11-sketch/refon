import { useEffect, useSyncExternalStore } from 'react'
import { apiRequest } from './api-client.js'
import { SITE_INFO } from '../content/site-info.js'

/**
 * Booth details the admin can change on fair day: the booth number, the
 * Viber chat link and the announcement banner. Until the API answers (or if it never does) the values in
 * `site-info.js` are used, so every page always has something to show.
 */
const DEFAULTS = Object.freeze({ booth: SITE_INFO.location.booth, viber: SITE_INFO.chat.viber, announcement: null })

/** Refetch on tab focus at most this often, so switching tabs stays cheap. */
const STALE_MS = 60_000

let current = DEFAULTS
let loadedAt = 0
let pending = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSiteSettings() {
  return current
}

/** Applies settings from the API; a `null` value keeps the code default. */
export function applySiteSettings(settings) {
  current = {
    booth: settings?.booth ?? DEFAULTS.booth,
    viber: settings?.viber ?? DEFAULTS.viber,
    announcement: settings?.announcement ?? DEFAULTS.announcement,
  }
  loadedAt = Date.now()
  emit()
}

export function loadSiteSettings({ force = false } = {}) {
  if (pending) return pending
  if (!force && Date.now() - loadedAt < STALE_MS) return Promise.resolve(current)
  pending = apiRequest('/site-settings')
    .then((data) => applySiteSettings(data.settings))
    .catch(() => {})
    .finally(() => {
      pending = null
    })
  return pending
}

export function updateSiteSettingsRequest(changes) {
  return apiRequest('/admin/site-settings', { method: 'PATCH', body: changes })
}

/**
 * The live booth settings. Loads once per minute at most, again when the tab
 * comes back into focus, and every `refreshMs` when given (the kiosk screen
 * runs all day without a reload).
 */
export function useSiteSettings({ refreshMs } = {}) {
  useEffect(() => {
    loadSiteSettings()
    const onFocus = () => document.visibilityState === 'visible' && loadSiteSettings()
    document.addEventListener('visibilitychange', onFocus)
    const timer = refreshMs ? window.setInterval(() => loadSiteSettings({ force: true }), refreshMs) : null
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      if (timer) window.clearInterval(timer)
    }
  }, [refreshMs])

  return useSyncExternalStore(subscribe, getSiteSettings, getSiteSettings)
}
