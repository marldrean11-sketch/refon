/**
 * Phase 2 smoke set.
 *
 * Four checks, deliberately. The full suite is Phase 1's regression baseline and
 * costs an hour; what this phase could plausibly have broken is narrower than
 * that — the shell renders, the three key routes render, and the cart still
 * accepts an item. Those are exactly what is asserted here, so a Phase 2 failure
 * cannot hide behind an unrelated red test.
 */
import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'

const PRODUCT_PATH = '/listings/40000000-0000-4000-8000-000000000004'

test.describe('P2 smoke', () => {
  test('home loads with the new shell and a clean console', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('navbar')).toBeVisible()
    await expect(page.getByTestId('site-footer')).toBeAttached()
    await page.waitForTimeout(1500)

    // One h1, and it is the page's, not a duplicate from the shell.
    await expect(page.locator('h1')).toHaveCount(1)

    expectNoFatalErrors(all, 'P2-smoke-home')
  })

  test('shop loads with the new shell and a clean console', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/phones', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('navbar')).toBeVisible()
    await page.locator('article').first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1200)

    expectNoFatalErrors(all, 'P2-smoke-shop')
  })

  test('a product page loads with the new shell and a clean console', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('navbar')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    expectNoFatalErrors(all, 'P2-smoke-product')
  })

  test('add to cart still works through the new drawer', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /add to cart/i }).first().click()

    // The badge is the shared signal: header, drawer, tab bar, and cart page all
    // read one provider, so the badge incrementing is proof the write landed.
    await expect
      .poll(async () => await page.getByTestId('navbar-cart').getAttribute('aria-label'), {
        timeout: 20_000,
      })
      .toMatch(/1 item/)

    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-drawer')).toBeVisible()
    await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })

    expectNoFatalErrors(all, 'P2-smoke-cart')
  })
})