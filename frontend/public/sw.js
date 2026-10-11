/*
 * ReFon service worker. Kept deliberately small:
 *
 * - Pages: network first, so a visitor always gets the latest deploy. If the
 *   network is down, the last copy of the app shell is used, and failing that a
 *   small offline page.
 * - /assets/*: cache first. Vite fingerprints these files, so a cached copy can
 *   never be stale.
 * - /api and /uploads are never cached: prices, stock and holds must be live.
 */
const VERSION = 'refon-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const PRECACHE = ['/offline.html', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          if (response.ok) caches.open(SHELL).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(async () => (await caches.match('/')) ?? caches.match('/offline.html')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
  }
})
