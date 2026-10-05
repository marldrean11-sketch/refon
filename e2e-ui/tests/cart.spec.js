import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'

/**
 * Cart backend surfaced through the browser.
 *
 * Phase 5 shipped the cart API but deliberately no cart page — that is Phase 6. So
 * there is nothing to click here. What these tests do is pin the parts of Phase 5
 * that are visible from the frontend's side:
 *
 *  - the API base the frontend talks to actually serves carts,
 *  - a guest cart round-trips through real browser cookies,
 *  - and the same cross-buyer guarantee holds when requests come from a browser
 *    rather than from the Node test client.
 *
 * Anything asserting cart *UI* would belong to Phase 6 and is not written here.
 */

const API = process.env.REFON_API ?? 'http://localhost:4000/api'

test.describe('C1 cart API reachable from the browser context', () => {
  test('C1 an anonymous visitor gets an empty cart and no cookie', async ({ request }) => {
    const response = await request.get(`${API}/cart`)

    expect(response.status()).toBe(200)

    const body = await response.json()

    expect(body.cart.itemCount).toBe(0)
    expect(body.cart.subtotal).toBe(0)
    expect(body.cart.currency).toBe('PHP')
    expect(body.cart.owner).toBe('GUEST')

    // Reading an empty cart must not hand every visitor a cookie.
    const setCookie = response.headers()['set-cookie'] ?? ''
    expect(setCookie).not.toContain('refon_cart=')
  })

  test('C1 a cart round-trips through real browser cookies', async ({ playwright }) => {
    const catalog = await playwright.request.newContext().then(async (context) => {
      const response = await context.get(`${API}/listings?pageSize=5`)
      const body = await response.json()
      await context.dispose()
      return body.listings
    })

    expect(catalog.length).toBeGreaterThan(0)

    // Two isolated browser contexts, each with its own cookie jar.
    const browser = await playwright.chromium.launch()
    const firstContext = await browser.newContext()
    const secondContext = await browser.newContext()

    try {
      const first = await firstContext.request.post(`${API}/cart/items`, {
        data: { listingId: catalog[0].id },
      })

      expect(first.status()).toBe(201)

      const firstBody = await first.json()

      expect(firstBody.created).toBe(true)
      expect(firstBody.cart.itemCount).toBe(1)
      expect(firstBody.cart.items[0].quantity).toBe(1)
      expect(firstBody.cart.items[0].reservation.status).toBe('ACTIVE')
      expect(firstBody.cart.items[0].issues).toEqual(['OK'])

      // The hold is scoped to the device, not to the session, so a second browser
      // is refused even though it shares nothing with the first.
      const second = await secondContext.request.post(`${API}/cart/items`, {
        data: { listingId: catalog[0].id },
      })

      expect(second.status()).toBe(409)
      expect((await second.json()).code).toBe('LISTING_RESERVED')

      // The first cart still reads back through its cookie alone.
      const readBack = await firstContext.request.get(`${API}/cart`)

      expect((await readBack.json()).cart.itemCount).toBe(1)

      const removed = await firstContext.request.delete(
        `${API}/cart/items/${catalog[0].id}`,
      )

      expect(removed.status()).toBe(200)
      expect((await removed.json()).cart.itemCount).toBe(0)
    } finally {
      await browser.close()
    }
  })

  test('C1 a cart is never cached by an intermediary', async ({ request }) => {
    const response = await request.get(`${API}/cart`)

    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('C1 the API refuses unknown cart fields rather than trusting them', async ({ request }) => {
    const response = await request.post(`${API}/cart/items`, {
      data: { listingId: '00000000-0000-4000-8000-000000000000', price: 1 },
    })

    expect(response.status()).toBe(422)
  })
})

/**
 * No console noise from the cart work.
 *
 * The backend cannot log in the browser, but this guards against a frontend import
 * cycle or a stray fetch that the API additions might have introduced.
 */
test('C1 the app boots with no console errors', async ({ page }) => {
  const all = watchErrors(page)

  await page.goto('/')
  await expect(page.getByRole('heading').first()).toBeVisible()

  expectNoFatalErrors(all, 'C1-home')
})
