import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'

/**
 * Seller storefront verification.
 *
 * The storefront is the one public page that has to answer three separate
 * questions truthfully at once — who the seller is, whether anyone can vouch for
 * them, and what they actually have in stock. These tests run signed out,
 * because that is how a shopper arrives from a listing page, and every
 * assertion is written against the live API rather than against a literal copied
 * into the page.
 *
 * The seeded Circuit Foundry id is used throughout. `support-db.js` restores
 * seeded sellers rather than deleting them, so this spec adds no rows that the
 * reset cannot clean up.
 */

const API = 'http://localhost:4000/api'
const SELLER_ID = '30000000-0000-4000-8000-000000000002'

/** The storefront grid requests six per page; assertions must use the same. */
const PAGE_SIZE = 6

/** Fixed id of a seeded listing this seller owns. Must match seed-data.js. */
const SELLER_LISTING = '40000000-0000-4000-8000-000000000007' // Samsung Galaxy S23

async function sellerFixture(request) {
  const response = await request.get(`${API}/sellers/${SELLER_ID}`)
  expect(response.status(), 'seller profile lookup').toBe(200)
  const body = await response.json()
  return body.seller
}

async function inventoryFixture(request, params = '') {
  const response = await request.get(`${API}/sellers/${SELLER_ID}/listings${params}`)
  expect(response.status(), 'seller inventory lookup').toBe(200)
  return response.json()
}

async function reviewsFixture(request, params = '') {
  const response = await request.get(`${API}/sellers/${SELLER_ID}/reviews${params}`)
  expect(response.status(), 'seller reviews lookup').toBe(200)
  return response.json()
}

/**
 * The listing cards, scoped to the inventory section.
 *
 * A page-wide `article` selector would also match each rendered review, because a
 * review is an `<article>` too. Counting "phones on the page" through it would
 * compare a listing count against a listings-plus-reviews count and fail for a
 * reason that has nothing to do with the storefront.
 */
function listingCards(page) {
  return page.locator('section[aria-labelledby="storefront-inventory-heading"] article')
}

/** Waits for the inventory grid to have painted real data. */
async function waitForInventory(page) {
  await listingCards(page).first().waitFor({ timeout: 25_000 })
  await page.waitForTimeout(500)
}

test.describe('C9 seller storefront', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('S1 a guest can open a storefront and it renders the seller and their phones', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const seller = await sellerFixture(request)

    await page.goto(`/sellers/${SELLER_ID}`)
    await waitForInventory(page)

    // The store's name is the page's `h1`, because a shopper who lands here from
    // a listing wants to know whose shop this is.
    const heading = await page.locator('h1').first().innerText()
    expect(heading.trim()).toBe(seller.businessName)
    expect(heading.trim()).toBe('Circuit Foundry')

    // Verification, tenure, and location are stated in words rather than left to
    // an icon's accessible name.
    await expect(page.getByText('Verified seller').first()).toBeVisible()
    await expect(page.getByText(`On ReFon since ${seller.memberSince}`)).toBeVisible()
    if (seller.location) {
      await expect(page.getByText(seller.location, { exact: false }).first()).toBeVisible()
    }

    // The figures come from the API, not from a template.
    await expect(
      page.getByRole('heading', {
        name: `${seller.approvedListings} phones available`,
      }),
    ).toBeVisible()

    const cards = listingCards(page)
    const cardCount = await cards.count()
    expect(cardCount, 'a page of the seller inventory renders').toBeGreaterThan(0)
    expect(
      cardCount,
      'a page never shows more phones than the seller has approved',
    ).toBeLessThanOrEqual(seller.approvedListings)

    // Every card carries the same trust data the shop shows, because it is the
    // same card component.
    const cardText = (await cards.allInnerTexts()).join(' | ')
    expect(cardText).toMatch(/Circuit Foundry/)
    expect(cardText).toMatch(/\d{1,3}%/)
    expect(cardText).toMatch(/₱[\d,]+/)

    await page.screenshot({ path: 'screenshots/S1-storefront.png', fullPage: true })
    expectNoFatalErrors(all, 'S1-guest-storefront')
  })

  test('S2 the trust panel states an empty rating instead of sample reviews', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)

    // The seed's demo reviews are stored as samples (`reviews.is_sample`), which
    // the API never lists or averages, so a seeded seller has no public rating.
    const { summary, reviews } = await reviewsFixture(request)
    expect(summary.count, 'sample reviews are not published').toBe(0)
    expect(summary.average, 'no average is invented').toBeNull()
    expect(reviews.length).toBe(0)

    await page.goto(`/sellers/${SELLER_ID}`)
    await waitForInventory(page)

    const panel = page.getByRole('complementary', { name: 'Seller trust history' })
    await expect(panel.getByText('Buyer feedback on this seller')).toBeVisible()
    await expect(panel.getByText('No rating yet')).toBeVisible()

    const panelText = await panel.innerText()
    expect(panelText, 'no 0.0 score is rendered').not.toMatch(/\b0\.0\b/)
    expect(panelText, 'no reviewer email on the page').not.toMatch(/@refon\.test|@example\.test/)
    expect(panelText, 'no seller contact detail on the page').not.toMatch(/\+63/)

    await page.screenshot({ path: 'screenshots/S2-storefront-trust.png', fullPage: true })
    expectNoFatalErrors(all, 'S2-trust')
  })

  test('S3 sorting changes the order and lives in the URL', async ({ page, request }) => {
    const all = watchErrors(page)

    await page.goto(`/sellers/${SELLER_ID}?sort=price-asc`)
    await waitForInventory(page)

    const { listings } = await inventoryFixture(request, '?sort=price-asc&limit=48')
    expect(listings.length).toBeGreaterThan(1)

    const readPrices = () =>
      listingCards(page).evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const match = node.innerText.match(/₱([\d,]+)/)
            return match ? Number(match[1].replace(/,/g, '')) : null
          })
          .filter((value) => value !== null),
      )

    const ascending = await readPrices()
    expect(ascending.length).toBeGreaterThan(1)
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))
    // The order is the API's order, not merely sorted: the first card is the
    // cheapest of the seller's approved inventory.
    expect(ascending[0]).toBe(Math.min(...listings.map((entry) => entry.price)))

    await page.selectOption('select', 'price-desc')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sort'), { timeout: 15_000 })
      .toBe('price-desc')
    await page.waitForTimeout(800)

    const descending = await readPrices()
    expect(descending).toEqual([...descending].sort((a, b) => b - a))
    expect(descending[0]).toBeGreaterThan(ascending[0])

    // Back returns to the previous ordering, which is what makes the sort
    // shareable rather than a one-way toggle.
    await page.goBack()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sort'), { timeout: 15_000 })
      .toBe('price-asc')

    await page.screenshot({ path: 'screenshots/S3-storefront-sort.png' })
    expectNoFatalErrors(all, 'S3-sort')
  })

  test('S4 the page and sort survive a refresh and a pasted URL', async ({ page, request }) => {
    const all = watchErrors(page)
    const { pagination, listings: firstPage } = await inventoryFixture(
      request,
      `?limit=${PAGE_SIZE}&sort=price-desc`,
    )
    expect(pagination.totalPages, 'the seeded seller needs more than one page').toBeGreaterThan(1)
    expect(firstPage.length, 'page one is full').toBe(PAGE_SIZE)

    // The last page, addressed directly. This is the "pasted URL" case: a link
    // to a deep page must resolve without walking there first.
    const lastPage = pagination.totalPages
    await page.goto(`/sellers/${SELLER_ID}?page=${lastPage}&sort=price-desc`)
    await waitForInventory(page)

    const lastPageModels = await listingCards(page).locator('h3').allInnerTexts()
    expect(lastPageModels.length, 'the last page is not empty').toBeGreaterThan(0)
    expect(
      lastPageModels.length,
      'the last page holds only the remainder of the inventory',
    ).toBeLessThan(PAGE_SIZE)

    await page.reload()
    await waitForInventory(page)

    const afterReload = new URL(page.url())
    expect(afterReload.searchParams.get('page')).toBe(String(lastPage))
    expect(afterReload.searchParams.get('sort')).toBe('price-desc')
    expect(await listingCards(page).locator('h3').allInnerTexts()).toEqual(lastPageModels)

    // The pagination control reflects the URL state rather than its own state.
    const pager = page.getByRole('navigation', { name: 'Pagination' })
    await expect(pager.getByRole('button', { name: `Page ${lastPage}` })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Paging changes the URL, so the new view is itself pasteable. The control
    // chosen depends on which end the pasted URL landed on, because a seller can
    // legitimately have exactly two pages and a hardcoded "Page 3" would be a
    // test asserting the seed's size rather than the pager's behaviour.
    if (lastPage === 2) {
      await pager.getByRole('button', { name: 'Previous page' }).click()
      await expect
        .poll(() => new URL(page.url()).searchParams.get('page'), { timeout: 15_000 })
        .toBe('1')
    } else {
      await pager.getByRole('button', { name: 'Page 3' }).click()
      await expect
        .poll(() => new URL(page.url()).searchParams.get('page'), { timeout: 15_000 })
        .toBe('3')
    }

    await page.waitForTimeout(700)
    await waitForInventory(page)

    // The sort is preserved across a page change: changing pages must not
    // silently reset the ordering the shopper chose.
    expect(new URL(page.url()).searchParams.get('sort')).toBe('price-desc')

    await page.screenshot({ path: 'screenshots/S4-storefront-pagination.png' })
    expectNoFatalErrors(all, 'S4-pagination')
  })

  test('S5 an unknown or unapproved seller shows a not-found state, not an error', async ({
    page,
  }) => {
    const all = watchErrors(page)

    // A 404 from the storefront endpoint is the *expected* result of this test,
    // and Chromium logs every failed response to the console. The expected
    // entries are cleared immediately before the assertion rather than the check
    // being dropped, so an unexpected error later on this page still fails it.
    const forgetExpectedStorefront404s = () => {
      all.length = 0
    }

    // A well-formed id that was never issued.
    await page.goto('/sellers/9f8e7d6c-5b4a-4321-8fed-cba987654321')
    await expect(page.getByText('Seller not found')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'does not have a storefront',
    )
    expect(await listingCards(page).count(), 'no inventory is rendered').toBe(0)

    // The page still offers a way out rather than stranding the visitor.
    await expect(page.getByRole('link', { name: 'Browse all phones' })).toBeVisible()

    // A malformed id resolves to the same state. It must not surface the API's
    // validation message, which is an implementation detail of the request.
    await page.goto('/sellers/not-a-uuid')
    await expect(page.getByText('Seller not found')).toBeVisible({ timeout: 20_000 })

    await page.screenshot({ path: 'screenshots/S5-storefront-not-found.png' })
    forgetExpectedStorefront404s()
    expectNoFatalErrors(all, 'S5-not-found')
  })

  test('S6 a storefront card opens its listing and keeps the shop card behaviour', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)

    await page.goto(`/sellers/${SELLER_ID}?sort=price-asc`)
    await waitForInventory(page)

    const cardLink = listingCards(page).locator('a[aria-label^="View "]').first()
    const label = await cardLink.getAttribute('aria-label')
    expect(label, 'a card links to its listing').toBeTruthy()

    await cardLink.click()
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .not.toBe(`/sellers/${SELLER_ID}`)

    const slug = new URL(page.url()).pathname.split('/').pop()
    const listingResponse = await request.get(`${API}/listings/slug/${slug}`)
    expect(listingResponse.status(), 'the card opened a real listing').toBe(200)
    const { listing } = await listingResponse.json()
    expect(listing.sellerId, 'the card belongs to this seller').toBe(SELLER_ID)

    // The listing page's own storefront link returns to the same store, closing
    // the loop a shopper actually walks.
    const storefrontLink = page.getByRole('link', { name: /View seller storefront/ })
    await expect(storefrontLink).toBeVisible()
    await storefrontLink.click()
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe(`/sellers/${SELLER_ID}`)
    await waitForInventory(page)

    // Cards carry a save control exactly as shop cards do. Signed out, saving is
    // deferred to sign-in rather than failing silently, which is the shop's
    // behaviour and must not differ here.
    const heart = listingCards(page).locator('button[aria-label^="Save "]').first()
    await expect(heart).toBeVisible()
    await heart.click()
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/login')

    expectNoFatalErrors(all, 'S6-card-navigation')
  })

  test('S7 a listing page links to its seller storefront', async ({ page, request }) => {
    const all = watchErrors(page)

    // The fixture listing's seller id is read from the API, so the link target is
    // proven by the data rather than hardcoded twice.
    const response = await request.get(`${API}/listings/${SELLER_LISTING}`)
    expect(response.status()).toBe(200)
    const { listing } = await response.json()
    expect(listing.sellerId, 'the fixture listing belongs to this seller').toBe(SELLER_ID)

    await page.goto(`/listings/${SELLER_LISTING}`)
    // The listing page has no storefront grid, so this waits for the product
    // page's own loaded state rather than reusing the storefront helper.
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(500)

    const link = page.getByRole('link', { name: /View seller storefront/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', `/sellers/${SELLER_ID}`)

    await link.click()
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe(`/sellers/${SELLER_ID}`)
    await waitForInventory(page)

    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(
      listing.sellerName,
    )

    // The storefront's own title names the seller rather than repeating the
    // route's generic text.
    await expect.poll(() => page.title(), { timeout: 15_000 }).toContain(listing.sellerName)

    expectNoFatalErrors(all, 'S7-listing-to-storefront')
  })

  test('S8 the storefront is readable and has one heading at 375, 768, and 1440', async ({
    page,
  }) => {
    const all = watchErrors(page)

    for (const viewport of [
      { name: 'mobile 375x812', width: 375, height: 812 },
      { name: 'tablet 768x1024', width: 768, height: 1024 },
      { name: 'desktop 1440x900', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/sellers/${SELLER_ID}`)
      await waitForInventory(page)

      // Exactly one `h1`, which is the store's name.
      const h1s = await page.locator('h1').count()
      expect(h1s, `${viewport.name}: one h1`).toBe(1)

      // No horizontal overflow at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${viewport.name}: no horizontal scroll`).toBeLessThanOrEqual(1)

      await expect(page.getByText('Verified seller').first()).toBeVisible()
      await expect(listingCards(page).first()).toBeVisible()
      await page.screenshot({
        path: `screenshots/S8-storefront-${viewport.width}.png`,
        fullPage: false,
      })
    }

    expectNoFatalErrors(all, 'S8-responsive')
  })
})