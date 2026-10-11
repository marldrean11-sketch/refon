/**
 * "Install as app" support. The service worker is registered only in production
 * builds, so the dev server and the UI tests never run against a cached copy.
 *
 * Chrome and Edge fire `beforeinstallprompt` when the site can be installed; it
 * is kept here so the footer button can show the browser's own install dialog.
 * Safari on iPhone has no such event: visitors add it from the Share menu, so
 * the button explains that instead.
 */
const listeners = new Set()
let deferredPrompt = null
let installed = false

function notify() {
  listeners.forEach((listener) => listener(getInstallState()))
}

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

export function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/** 'installed' | 'prompt' (browser dialog available) | 'ios' (Share menu) | 'unavailable' */
export function getInstallState() {
  if (installed || isStandalone()) return 'installed'
  if (deferredPrompt) return 'prompt'
  if (isIos()) return 'ios'
  return 'unavailable'
}

export function onInstallChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Opens the browser's install dialog. Resolves to true if the visitor accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false
  const prompt = deferredPrompt
  deferredPrompt = null
  prompt.prompt()
  const { outcome } = await prompt.userChoice
  notify()
  return outcome === 'accepted'
}

export function installPwa() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    notify()
  })
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
