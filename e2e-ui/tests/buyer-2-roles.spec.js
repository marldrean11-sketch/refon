import { test, expect } from '@playwright/test'
import { tryClickHeart, watchErrors, expectNoFatalErrors } from './support.js'
import { LISTINGS, openListing } from './constants.js'

async function apiLogin(request, email, password) {
  const res = await request.post('http://localhost:4000/api/auth/login', {
    data: { email, password },
  })
  expect(res.status(), await res.text()).toBe(200)
  return res.headers()['set-cookie']
}

test.describe('buyer C7', () => {
  test.use({ storageState: 'state/buyer2.json' })

  test('C7 mark-sold propagates to /saved, /my-inquiries and notification targets', async ({ page, request }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.iphone6s)
    await page.screenshot({ path: 'screenshots/C7-01-before-sold.png' })
    const saveResult = await tryClickHeart(page, 'Save Apple iPhone 6s')
    console.log('C7_SAVE', JSON.stringify(saveResult))

    await page.getByRole('button', { name: /^Inquire( about this phone)?$/i }).first().click()
    await page.getByRole('dialog').waitFor()
    await page.locator('#inquiry-name').fill('E2E Sold Buyer')
    await page.locator('#inquiry-contact').fill('e2e-sold@example.test')
    await page.getByRole('button', { name: /Send inquiry/i }).click()
    await page.waitForTimeout(1700)

    const sellerCookie = await apiLogin(request, 'seller@refon.test', 'SellerTest123!')
    const sold = await request.patch(
      `http://localhost:4000/api/listings/${LISTINGS.iphone6s}/mark-sold`,
      { headers: { Cookie: sellerCookie } },
    )
    expect(sold.status(), await sold.text()).toBe(200)

    await page.goto('/saved')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(1100)
    await page.screenshot({ path: 'screenshots/C7-02-saved-sold-badge.png' })
    const savedText = await page.locator('body').innerText()
    const savedHasSold = /\bSold\b/.test(savedText)
    console.log('C7_SAVED_HAS_SOLD_BADGE', savedHasSold)

    await page.goto('/my-inquiries')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    await page.screenshot({ path: 'screenshots/C7-03-my-inquiries-sold-chip.png' })
    const inqText = await page.locator('body').innerText()
    const inqHasSold = /\bSold\b/.test(inqText)
    console.log('C7_MYINQ_HAS_SOLD_CHIP', inqHasSold)

    await page.getByRole('button', { name: /Notifications/i }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/C7-04-bell-sold.png' })
    await page.getByText(/has been sold/i).first().click()
    await page.waitForTimeout(1500)
    const soldUrl = page.url()
    const soldHeading = await page.locator('h1').innerText()
    console.log('C7_SOLD_NOTIF_URL', soldUrl, 'heading', soldHeading)

    await page.getByRole('button', { name: /Notifications/i }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/C7-05-bell-inquiry.png' })
    await page.getByText(/your inquiry about the/i).first().click()
    await page.waitForTimeout(1500)
    const inqUrl = page.url()
    console.log('C7_INQUIRY_NOTIF_URL', inqUrl)

    expect(saveResult.clicked, `heart clickable (error: ${saveResult.clickError})`).toBe(true)
    expect(savedHasSold, '/saved shows a Sold badge').toBe(true)
    expect(inqHasSold, '/my-inquiries shows a Sold chip').toBe(true)
    // The notification still deep-links by id, and the app replaces the address
    // with the canonical slug once the listing resolves. Both forms work; the
    // shopper lands on the product page either way.
    expect(
      soldUrl,
      'LISTING_SOLD resolves to the sold iPhone 6s product page',
    ).toMatch(/\/phones\/apple-iphone-6s|\/listings\/40000000-0000-4000-8000-000000000001/)

    const soldHeadingAfter = await page.locator('h1').innerText()
    expect(soldHeading, 'the sold listing is shown').toContain('iPhone 6s')
    expect(soldHeadingAfter, 'the inquiry notification still reaches /my-inquiries').toBe(
      'My Inquiries',
    )
    expect(inqUrl, 'INQUIRY_SENT -> /my-inquiries').toContain('/my-inquiries')
    expectNoFatalErrors(all, 'C7')
  })
})

test.describe('seller C8', () => {
  test.use({ storageState: 'state/seller.json' })

  test('C8 seller: no hearts, may open /saved and /my-inquiries', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/browse')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'screenshots/C8-01-seller-browse.png' })
    const sellerHearts = await page.locator('button[aria-label^="Save "]').count()
    console.log('C8_SELLER_HEARTS', sellerHearts)
    expect(sellerHearts, 'seller sees no hearts').toBe(0)

    for (const [name, path] of [['saved', '/saved'], ['myinquiries', '/my-inquiries']]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(900)
      await page.screenshot({ path: `screenshots/C8-0${name === 'saved' ? 2 : 3}-seller-${name}.png` })
      const forbidden = await page.getByText(/access restricted|not authorized|forbidden/i).count()
      const heading = await page.locator('h1').first().innerText().catch(() => '')
      console.log(`C8_SELLER_${name.toUpperCase()}_URL`, page.url(), 'FORBIDDEN', forbidden, 'HEADING', JSON.stringify(heading))
      expect(new URL(page.url()).pathname, `seller reaches ${path}`).toBe(path)
      expect(forbidden, `seller not forbidden on ${path}`).toBe(0)
    }
    expectNoFatalErrors(all, 'C8')
  })
})

test.describe('admin C8', () => {
  test.use({ storageState: 'state/admin.json' })

  test('C8 admin: no hearts and no Saved/My Inquiries links', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/browse')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'screenshots/C8-04-admin-browse.png' })
    const adminHearts = await page.locator('button[aria-label^="Save "]').count()
    const adminSaved = await page.locator('a[href="/saved"]').count()
    const adminInq = await page.locator('a[href="/my-inquiries"]').count()
    console.log('C8_ADMIN_HEARTS', adminHearts, 'SAVED_LINKS', adminSaved, 'INQUIRY_LINKS', adminInq)
    expect(adminHearts, 'admin sees no hearts').toBe(0)
    expect(adminSaved, 'admin has no Saved link').toBe(0)
    expect(adminInq, 'admin has no My Inquiries link').toBe(0)
    expectNoFatalErrors(all, 'C8-admin')
  })
})
