import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'
import { LISTINGS } from './constants.js'

/**
 * Catalog verification.
 *
 * Covers the shop page as a shopper experiences it: filters, sorts, pagination,
 * URL synchronisation, active filter chips, empty and error states, the product
 * card's trust data, canonical product URLs, and responsive layout.
 */
const VIEWPORTS = [
  { name: 'mobile 375x812', width: 375, height: 812 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
  { name: 'desktop 1440x900', width: 1440, height: 900 },
]

test.describe('C1 catalog browse and filters', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('C1 shop page loads a paginated grid with trust data on every card', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(600)

    const cards = await page.locator('article').count()
    const prices = await page.locator('article').getByText(/₱[\d,]+/).count()
    const batteries = await page.locator('article').getByText(/\d{1,3}%/).count()
    const grades = await page.locator('article').getByText(/Grade [ABC]|Excellent|Very Good|Good\b/).count()
    const sellerNames = await page
      .locator('article')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) =>
            /ReFon Select|Circuit Foundry|Metro Devices|Signal Phone Hub/.test(node.innerText),
          ).length,
      )
    console.log('C1_CARDS', cards, 'PRICES', prices, 'BATTERY', batteries, 'SELLERS', sellerNames, 'GRADES', grades)

    expect(cards, 'a page of listings renders').toBeGreaterThan(3)
    expect(prices, 'every card shows a peso price').toBeGreaterThanOrEqual(cards)
    expect(batteries, 'every card shows battery health').toBeGreaterThanOrEqual(cards)
    expect(sellerNames, 'every card names its seller').toBeGreaterThanOrEqual(cards)
    expect(grades, 'every card states a condition grade').toBeGreaterThanOrEqual(cards)

    await page.screenshot({ path: 'screenshots/C1-shop-grid.png' })
    expectNoFatalErrors(all, 'C1-grid')
  })

  test('C2 filtering by brand updates the URL and the result set', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })

    const before = await page.locator('article').count()
    await page.locator('label').filter({ hasText: /^Samsung/ }).first().click()
    await page.waitForTimeout(900)

    expect(new URL(page.url()).searchParams.get('brand'), 'brand is in the URL').toBe('Samsung')

    const brands = await page.locator('article h3').allInnerTexts()
    const models = (await page.locator('article').allInnerTexts()).join(' ')
    console.log('C2_AFTER', before, '->', await page.locator('article').count())
    expect(models).not.toMatch(/iPhone/)
    expect(brands.length).toBeGreaterThan(0)

    await page.screenshot({ path: 'screenshots/C2-brand-filter.png' })
    expectNoFatalErrors(all, 'C2-brand')
  })

  test('C3 filters survive a refresh and clear via the chip', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones?conditionGrade=B')
    await page.waitForSelector('article', { timeout: 25_000 })

    const chips = page.locator('button', { hasText: 'Condition:' })
    expect(await chips.count(), 'a condition chip is shown').toBe(1)

    await page.reload()
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(600)

    expect(new URL(page.url()).searchParams.get('conditionGrade'), 'filter survives refresh').toBe('B')
    expect(await page.locator('button', { hasText: 'Condition:' }).count(), 'chip still shown').toBe(1)

    await page.locator('button', { hasText: 'Condition:' }).click()
    await page.waitForTimeout(900)

    expect(
      new URL(page.url()).searchParams.get('conditionGrade'),
      'removing the chip clears the parameter',
    ).toBeNull()

    expectNoFatalErrors(all, 'C3-chips')
  })

  test('C4 browser back restores the previous filter state', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })

    await page.locator('label').filter({ hasText: /^Apple/ }).first().click()
    await page.waitForTimeout(800)
    expect(new URL(page.url()).searchParams.get('brand')).toBe('Apple')

    await page.goBack()
    await page.waitForTimeout(1000)
    expect(
      new URL(page.url()).searchParams.get('brand'),
      'back button clears the filter',
    ).toBeNull()

    expectNoFatalErrors(all, 'C4-back')
  })

  test('C5 sorting is shareable through the URL', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones?sort=price-asc')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(700)

    // The first non-struck-through price on each card is the selling price.
    const prices = await page.locator('article').evaluateAll((cards) =>
      cards.map((card) => {
        const node = [...card.querySelectorAll('p')].find((entry) => {
          const text = entry.textContent.trim()
          return /^₱[\d,]+$/.test(text) && getComputedStyle(entry).textDecorationLine === 'none'
        })
        return node ? Number(node.textContent.replace(/[^\d]/g, '')) : null
      }),
    )

    const ordered = [...prices].sort((a, b) => a - b)
    console.log('C5_PRICES', prices.slice(0, 5))
    expect(prices.filter((value) => value !== null)).toEqual(
      prices.filter((value) => value !== null).sort((a, b) => a - b),
    )
    expect(prices.every((value) => value !== null), 'every card exposes a selling price').toBe(true)

    await expect(page.getByLabel('Sort by')).toHaveValue('price-asc')
    expectNoFatalErrors(all, 'C5-sort')
  })

  test('C6 pagination moves between pages without repeating a listing', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const pageTwo = page.getByRole('button', { name: 'Page 2' })
    if ((await pageTwo.count()) === 0) {
      console.log('C6 only one page of results; nothing to paginate')
      return
    }

    const firstIds = await page.locator('article a[href^="/phones/"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href')),
    )

    await pageTwo.click()
    await page.waitForTimeout(1000)

    expect(new URL(page.url()).searchParams.get('page')).toBe('2')
    const secondIds = await page.locator('article a[href^="/phones/"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href')),
    )
    const overlap = firstIds.filter((id) => secondIds.includes(id))
    console.log('C6_PAGES', firstIds.length, secondIds.length, 'overlap', overlap.length)
    expect(overlap.length, 'no listing appears on both pages').toBe(0)

    expectNoFatalErrors(all, 'C6-pagination')
  })

  test('C7 an impossible filter combination shows the empty state with a way out', async ({
    page,
  }) => {
    const all = watchErrors(page)
    // Apple plus a RAM value no Apple listing carries.
    await page.goto('/phones?brand=Apple&ram=16%20GB')
    await page.waitForTimeout(1400)

    const body = await page.locator('body').innerText()
    console.log('C7_EMPTY', /No phones found/i.test(body))
    expect(body).toMatch(/No phones found/i)
    expect(
      await page.getByRole('button', { name: /Clear all filters/i }).count(),
      'a way out is offered',
    ).toBeGreaterThan(0)

    await page.screenshot({ path: 'screenshots/C7-empty-state.png' })
    expectNoFatalErrors(all, 'C7-empty')
  })

  test('C8 an unsupported filter is refused rather than silently ignored', async ({ request }) => {
    const response = await request.get('http://localhost:4000/api/listings?nonsenseFilter=1')
    expect(response.status(), 'unsupported filter is a 422').toBe(422)
    const body = await response.json()
    expect(body.errors, 'the error names the offending parameter').toBeTruthy()

    for (const [query, field] of [
      ['?conditionGrade=Z', 'conditionGrade'],
      ['?category=not-a-category', 'category'],
      ['?sort=cheapest', 'sort'],
      ['?ram=99%20GB', 'ram'],
    ]) {
      const bad = await request.get(`http://localhost:4000/api/listings${query}`)
      expect(bad.status(), `${query} rejected`).toBe(422)
      const payload = await bad.json()
      expect(Object.keys(payload.errors), `${query} names "${field}"`).toContain(field)
    }
  })

  test('C9 search from the header lands on real results', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 25_000 })

    // The header search is a button that opens the search dialog.
    await page.getByTestId('navbar-search').click()
    const field = page.getByRole('dialog').getByRole('combobox').first()
    await field.click()
    await field.fill('iphone 13')
    await page.waitForTimeout(900)

    // Suggestions are only ever built from approved catalog rows.
    const panel = page.getByRole('listbox', { name: 'Phone suggestions' })
    if (await panel.count()) {
      const text = await panel.innerText()
      console.log('C9_SUGGEST', text.split('\n').slice(0, 3).join(' | '))
      expect(text.toLowerCase()).toContain('iphone 13')
    }

    await field.press('Enter')
    await page.waitForTimeout(1200)

    expect(new URL(page.url()).pathname).toBe('/phones')
    expect(new URL(page.url()).searchParams.get('search')).toBe('iphone 13')

    const results = await page.locator('article').count()
    const text = await page.locator('main').innerText()
    console.log('C9_RESULTS', results)
    expect(results, 'search returns at least one listing').toBeGreaterThan(0)
    expect(text).toMatch(/iPhone 13/i)

    expectNoFatalErrors(all, 'C9-search')
  })

  test('C10 category links land on filtered results, never an empty page', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/categories')
    await page.waitForTimeout(800)

    const hrefs = await page.locator('main a[href^="/phones?"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href')),
    )
    expect(hrefs.length, 'category cards link to the catalog').toBeGreaterThan(4)

    for (const href of hrefs) {
      await page.goto(href)
      await page.waitForSelector('article', { timeout: 25_000 })
      const count = await page.locator('article').count()
      const body = await page.locator('main').innerText()
      console.log('C10', href, '->', count, 'results')
      expect(count, `${href} returns listings`).toBeGreaterThan(0)
      expect(body, `${href} is not an empty page`).not.toMatch(/No phones found/i)
    }

    expectNoFatalErrors(all, 'C10-categories')
  })
})

test.describe('C11 product detail', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('C11 canonical slug URL resolves and is the address the card links to', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(500)

    const firstHref = await page.locator('article a[href^="/phones/"]').first().getAttribute('href')

    await page.goto(firstHref)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(600)

    console.log('C11_SLUG_URL', page.url())
    expect(page.url()).toContain(firstHref)
    await expect(page.locator('h1')).toContainText(/\w/)

    await page.screenshot({ path: 'screenshots/C11-product-detail.png' })
    expectNoFatalErrors(all, 'C11-slug')
  })

  test('C12 detail page publishes grade, battery, warranty, and inspection', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/phones/apple-iphone-13-128-gb-midnight')
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(600)

    const body = await page.locator('main').innerText()

    expect(body, 'condition grade is stated').toMatch(/Grade A/i)
    expect(body, 'battery percentage is stated').toMatch(/\d{2}%/)
    expect(body, 'warranty or sold-as-is is stated').toMatch(/warranty|sold as-is/i)
    expect(body, 'specifications are listed').toMatch(/Full specifications/i)
    expect(body, 'inspection results are shown').toMatch(/Quality inspection/i)
    expect(body, 'IMEI status is disclosed').toMatch(/IMEI (verified|not verified)/i)
    expect(body, 'return policy is offered').toMatch(/7-day return/i)

    const checks = await page.locator('text=Display tested').count()
    expect(checks, 'the checklist names real checks').toBeGreaterThan(0)

    await page.screenshot({ path: 'screenshots/C12-detail-trust.png', fullPage: false })
    expectNoFatalErrors(all, 'C12-trust')
  })

  test('C13 legacy /listings/:id redirects to the canonical slug', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(`/listings/${LISTINGS.iphone13}`)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(900)

    console.log('C13_REDIRECTED', page.url())
    expect(page.url(), 'id URL is replaced by the canonical slug').toContain('/phones/')
    await expect(page.locator('h1')).toContainText('iPhone 13')

    expectNoFatalErrors(all, 'C13-redirect')
  })

  test('C14 a discount is only shown when the reference price is genuinely higher', async ({
    page,
  }) => {
    const all = watchErrors(page)
    await page.goto('/phones/apple-iphone-13-128-gb-midnight')
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(500)

    const body = await page.locator('main').innerText()
    const api = await page.request.get(
      'http://localhost:4000/api/listings/slug/apple-iphone-13-128-gb-midnight',
    )
    const { listing } = await api.json()

    console.log('C14_PRICE', listing.price, 'ORIGINAL', listing.originalPrice, 'PCT', listing.discountPercent)
    expect(listing.discountPercent, 'the seeded listing has a real saving').toBeGreaterThan(0)
    expect(body, 'the saving is stated').toMatch(/You save/i)
    expect(body, 'the percentage is stated').toMatch(/save \d+%/i)

    expectNoFatalErrors(all, 'C14-discount')
  })
})

test.describe('C15 catalog responsive layout', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const viewport of VIEWPORTS) {
    test(`C15 ${viewport.name}: no horizontal scroll, filters reachable`, async ({ page }) => {
      const all = watchErrors(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/phones')
      await page.waitForSelector('article', { timeout: 25_000 })
      await page.waitForTimeout(800)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      console.log('C15_OVERFLOW', viewport.name, overflow)
      expect(overflow, `${viewport.name} has no horizontal scroll`).toBeLessThanOrEqual(0)

      const filterToggle = page.getByRole('button', { name: /^Filters/ })
      if (viewport.width < 1024) {
        await expect(filterToggle, 'filters are reachable on small screens').toBeVisible()
        await filterToggle.click()
        await page.waitForTimeout(700)
        await expect(page.locator('#catalog-filter-drawer')).toBeVisible()
        await page.screenshot({ path: `screenshots/C15-filters-${viewport.width}.png` })
        await page.getByRole('button', { name: 'Close filters' }).click()
        await page.waitForTimeout(500)
      } else {
        await expect(page.getByRole('complementary', { name: 'Catalog filters' })).toBeVisible()
      }

      await page.screenshot({ path: `screenshots/C15-shop-${viewport.width}.png` })
      expectNoFatalErrors(all, `C15-${viewport.width}`)
    })
  }

  test('C16 catalog pages have no broken images or duplicate ids', async ({ page }) => {
    const failed = []
    page.on('requestfailed', (request) => {
      if (request.resourceType() === 'image') failed.push(request.url())
    })
    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(1000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(800)

    console.log('C16_FAILED_IMAGES', JSON.stringify(failed))
    expect(failed, 'no failed image requests').toEqual([])

    const duplicateIds = await page.evaluate(() => {
      const seen = new Map()
      for (const node of document.querySelectorAll('[id]')) {
        seen.set(node.id, (seen.get(node.id) ?? 0) + 1)
      }
      return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id)
    })
    console.log('C16_DUPLICATE_IDS', JSON.stringify(duplicateIds))
    expect(duplicateIds, 'no duplicate element ids').toEqual([])
  })
})
