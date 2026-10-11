import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'

/**
 * Homepage verification.
 *
 * Covers the promises the homepage makes: the hero copy, every section being
 * present, the live listing data actually rendering, no horizontal overflow at
 * any breakpoint, no console errors, and no dead internal links.
 */
const VIEWPORTS = [
  { name: 'mobile 375x812', width: 375, height: 812 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
  { name: 'desktop 1440x900', width: 1440, height: 900 },
]

// Phase 3A replaced the Featured and Best value grids with one New Arrivals grid.
const SECTIONS = [
  { id: 'arrivals-panel', label: 'New arrivals' },
  { id: 'grading', label: 'Condition grading' },
  { id: 'testing', label: 'Quality tested' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'sellers', label: 'Verified sellers' },
  { id: 'testimonials', label: 'Buyer voices' },
  { id: 'warranty', label: 'Warranty and returns' },
  { id: 'faq', label: 'FAQ' },
  { id: 'start', label: 'Final CTA' },
]

test.describe('H1 homepage content and structure', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('H1 hero states the value proposition with both CTAs', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.locator('h1').first().waitFor()

    const heading = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ')
    console.log('H1_HERO', heading)

    expect(heading).toMatch(/Pre-loved phones/i)
    expect(heading).toMatch(/Tested in the open/i)

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    expect(body).toMatch(/condition grades/i)
    expect(body).toMatch(/battery health/i)
    expect(body).toMatch(/warranty/i)
    expect(body).toMatch(/verified sellers/i)

    const shopCta = page.getByRole('link', { name: /Shop Refurbished Phones/i }).first()
    await expect(shopCta).toBeVisible()
    await expect(shopCta).toHaveAttribute('href', '/phones')

    const howCta = page.getByRole('link', { name: /How It Works/i }).first()
    await expect(howCta).toBeVisible()
    await expect(howCta).toHaveAttribute('href', '/how-it-works')

    expectNoFatalErrors(all, 'H1-hero')
  })

  test('H2 every homepage section renders', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(600)

    for (const section of SECTIONS) {
      const count = await page.locator(`#${section.id}`).count()
      console.log('H2_SECTION', section.id, count)
      expect(count, `#${section.id} (${section.label}) exists`).toBe(1)
    }

    expectNoFatalErrors(all, 'H2-sections')
  })

  test('H3 homepage product cards render live listings with trust data', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    const card = page.getByTestId('arrivals-card')
    await card.first().waitFor({ timeout: 20_000 })

    // The New Arrivals cards carry price, measured battery and grade. Seller trust
    // is stated on the shop cards and the product page rather than here.
    const cards = await card.count()
    const prices = await card.getByText(/₱[\d,]+/).count()
    const batteries = await card.getByText(/\d{1,3}%/).count()
    const grades = await card.getByText(/Excellent|Very Good|Good/).count()
    console.log('H3_CARDS', cards, 'PRICES', prices, 'BATTERY', batteries, 'GRADES', grades)

    expect(cards, 'new arrival cards rendered').toBeGreaterThanOrEqual(4)
    expect(prices, 'every card shows a peso price').toBeGreaterThanOrEqual(cards)
    expect(batteries, 'every card shows a battery percentage').toBeGreaterThanOrEqual(cards)
    expect(grades, 'every card shows its grade').toBeGreaterThanOrEqual(cards)

    await page.screenshot({ path: 'screenshots/H3-homepage-featured.png', fullPage: false })
    expectNoFatalErrors(all, 'H3-cards')
  })

  test('H4 grading and inspection sections name real checks', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.locator('#grading').waitFor()

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')

    // Each grade is set as its letter plus its name ("A", "Excellent").
    for (const grade of ['Excellent', 'Very Good', 'Good']) {
      expect(body, `${grade} is explained`).toContain(grade)
    }

    const checks = [
      'Display tested',
      'Touchscreen tested',
      'Camera tested',
      'Battery tested',
      'Face ID / Fingerprint tested',
    ]
    const testing = (await page.locator('#testing').innerText()).replace(/\s+/g, ' ')
    for (const check of checks) {
      expect(testing, `#testing mentions ${check}`).toContain(check)
    }

    await page.locator('#grading').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'screenshots/H4-homepage-grading.png' })
    expectNoFatalErrors(all, 'H4-grading')
  })

  test('H5 no fake urgency: no countdown timers or stock claims', async ({ page }) => {
    await page.goto('/')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(600)

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    console.log('H5_SAMPLE', body.slice(0, 0) || 'checked')

    for (const pattern of [
      /ends in/i,
      /only \d+ left/i,
      /\d+ (?:left|remaining) in stock/i,
      /hurry|act now|limited time/i,
    ]) {
      expect(body, `no urgency pattern ${pattern}`).not.toMatch(pattern)
    }
  })

  test('H6 all internal homepage links resolve', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.waitForTimeout(800)

    const hrefs = await page.locator('main a[href]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href')).filter(Boolean),
    )
    const internal = [...new Set(hrefs.filter((href) => href.startsWith('/')))]
    console.log('H6_INTERNAL_LINKS', internal.length)

    expect(internal.length).toBeGreaterThan(5)

    for (const href of internal) {
      const response = await page.request.get(`http://localhost:5173${href}`)
      expect(response.status(), `${href} responds 200`).toBe(200)
    }

    expectNoFatalErrors(all, 'H6-links')
  })

  test('H7 no broken images on the homepage', async ({ page }) => {
    const failed = []
    page.on('requestfailed', (request) => {
      if (request.resourceType() === 'image') {
        failed.push(request.url())
      }
    })
    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto('/')
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(800)

    console.log('H7_FAILED_IMAGES', JSON.stringify(failed))
    expect(failed, 'no failed image requests').toEqual([])
  })
})

test.describe('H8 responsive layout', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const viewport of VIEWPORTS) {
    test(`H8 ${viewport.name}: no horizontal scroll, hero readable`, async ({ page }) => {
      const all = watchErrors(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.locator('h1').first().waitFor()
      await page.waitForTimeout(700)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      console.log('H8_OVERFLOW', viewport.name, overflow)
      expect(overflow, `${viewport.name} has no horizontal scroll`).toBeLessThanOrEqual(0)

      await expect(page.getByRole('link', { name: /Shop Refurbished Phones/i }).first()).toBeVisible()
      await page.screenshot({ path: `screenshots/H8-home-${viewport.width}.png` })

      // Full-page capture catches sections that only break below the fold.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)
      await page.screenshot({
        path: `screenshots/H8-home-${viewport.width}-bottom.png`,
      })

      expectNoFatalErrors(all, `H8-${viewport.width}`)
    })
  }
})

test.describe('H9 homepage accessibility basics', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('H10 no fabricated social proof', async ({ page }) => {
    await page.goto('/')
    await page.locator('#testimonials').waitFor()
    await page.waitForTimeout(400)

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')

    // No invented customers, purchase histories, or star counts presented as
    // real reviews while the platform has no delivered orders.
    for (const pattern of [
      /verified purchase/i,
      /\d+ verified reviews/i,
      /bought (?:a|an|the) .{0,40}(?:iPhone|Galaxy|Pixel|Xiaomi|OPPO|OnePlus)/i,
    ]) {
      expect(body, `no fabricated claim ${pattern}`).not.toMatch(pattern)
    }

    // And the section must be explicit about its own status.
    expect(body, 'states that no orders have shipped yet').toMatch(
      /no delivered orders yet/i,
    )
  })

  test('H11 hero trust figures match the featured listing', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/listings')
    expect(response.status()).toBe(200)
    const { listings } = await response.json()

    const apple = listings.find(
      (listing) => listing.brand === 'Apple' && /iPhone 1[23]/i.test(listing.model),
    )
    const hero = apple ?? listings[0]

    await page.goto('/')
    await page.locator('h1').first().waitFor()
    const card = page.locator('a[data-testid="hero-panel"]')
    await card.waitFor({ timeout: 20_000 })

    // The battery figure in the hero must be the one the API reports, not a
    // decorative constant. It counts up on arrival, so wait for it to settle.
    await expect
      .poll(() => card.innerText(), { message: `hero shows the live battery figure for ${hero.model}` })
      .toContain(`${hero.batteryPercent}%`)
    const heroPanel = await card.innerText()
    expect(heroPanel).toContain(hero.model)
    expect(heroPanel).toContain(hero.storage)
  })

  test('H9 one h1, landmark structure, and no duplicate ids', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(600)

    const h1Count = await page.locator('h1').count()
    expect(h1Count, 'exactly one h1').toBe(1)

    const mainCount = await page.locator('main').count()
    expect(mainCount, 'single main landmark').toBe(1)

    const headingLevels = await page
      .locator('main h1, main h2, main h3')
      .evaluateAll((nodes) => nodes.map((node) => node.tagName))

    let previous = 1
    for (const tag of headingLevels) {
      const level = Number(tag.replace('H', ''))
      // A jump of more than one level breaks the document outline.
      expect(level - previous, `heading level step into ${tag}`).toBeLessThanOrEqual(1)
      previous = level
    }

    const duplicateIds = await page.evaluate(() => {
      const seen = new Map()
      const duplicates = []
      for (const node of document.querySelectorAll('[id]')) {
        seen.set(node.id, (seen.get(node.id) ?? 0) + 1)
      }
      for (const [id, count] of seen) {
        if (count > 1) {
          duplicates.push(id)
        }
      }
      return duplicates
    })
    console.log('H9_DUPLICATE_IDS', JSON.stringify(duplicateIds))
    expect(duplicateIds, 'no duplicate element ids').toEqual([])

    const imagesWithoutAlt = await page
      .locator('main img')
      .evaluateAll((nodes) => nodes.filter((node) => !node.getAttribute('alt')).length)
    expect(imagesWithoutAlt, 'every img has alt text').toBe(0)

    expectNoFatalErrors(all, 'H9-a11y')
  })
})
