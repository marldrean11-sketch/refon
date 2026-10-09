import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { watchErrors, expectNoFatalErrors, showListing } from './support.js'
import { LISTINGS } from './constants.js'

const state = JSON.parse(fs.readFileSync('state/buyer.json', 'utf8'))
const BUYER_COOKIE = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ')

async function apiReport(request, listingId, reason, details) {
  const res = await request.post(`http://localhost:4000/api/listings/${listingId}/reports`, {
    headers: { Cookie: BUYER_COOKIE },
    data: { reason, details },
  })
  return { status: res.status(), body: await res.json().catch(() => null) }
}

async function openReports(page) {
  await page.goto('/admin')
  await page.locator('h1').first().waitFor()
  await page.waitForTimeout(2200)
  await page.getByRole('tab', { name: /Reports/i }).click()
  await page.waitForTimeout(2200)
  const panel = await page.locator('[role="tabpanel"]').innerText().catch(() => '<no tabpanel>')
  console.log('OPEN_REPORTS_PANEL', JSON.stringify(panel.slice(0, 500)))
  const articles = await page.locator('article').count()
  console.log('OPEN_REPORTS_ARTICLES', articles)
}

/**
 * reportLimiter allows 5 report POSTs per 30 minutes per IP, so the whole run
 * budgets exactly five: D11 + D12 (duplicate) + D14 (own listing) happen in
 * admin-1-report-modal.spec.js, and this file seeds two more via the API
 * (iPhone 12 for the take-down, Galaxy A54 for the dismiss). D15 and the D17
 * resolve path reuse the report that D11 already created on Galaxy S21.
 */
test.describe('D15 reports queue', () => {
  test.use({ storageState: 'state/admin.json' })

  test('D15 tab + badge + arrow keys + card contents + stat grid + placeholder removed', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/admin')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'screenshots/D15-01-admin-overview.png' })

    const body = await page.locator('body').innerText()
    console.log('D15_HAS_0_OPEN_PLACEHOLDER', body.includes('0 open reports'))
    console.log('D15_HAS_REPORTS_SAFETY_PLACEHOLDER', body.includes('Reports & safety'))
    expect(body.includes('0 open reports'), 'old "0 open reports" placeholder removed').toBe(false)
    expect(body.includes('Reports & safety'), 'old "Reports & safety" placeholder removed').toBe(false)

    const stats = await page.evaluate(() => {
      // The overview's six metric labels since the dashboard redesign.
      const wanted = ['Pending sellers', 'Pending listings', 'Open reports', 'Sellers', 'Listings', 'Sold']
      return wanted.map((label) => {
        const el = [...document.querySelectorAll('p')].find((p) => p.textContent?.trim() === label)
        if (!el) return { label, found: false }
        const card = el.closest('div.rounded-card') ?? el.parentElement?.parentElement
        const r = card.getBoundingClientRect()
        return { label, found: true, top: Math.round(r.top), left: Math.round(r.left) }
      })
    })
    const found = stats.filter((s) => s.found)
    const rows = [...new Set(found.map((s) => s.top))]
    console.log('D15_STAT_CARDS_FOUND', found.length, 'ROWS', rows.length, 'VIEWPORT', await page.evaluate(() => window.innerWidth))
    console.log('D15_STAT_LAYOUT', JSON.stringify(stats))

    await page.getByRole('tab', { name: /Reports/i }).click()
    await page.waitForTimeout(1800)
    await page.screenshot({ path: 'screenshots/D15-02-reports-tab.png', fullPage: true })

    const panelText = await page.locator('[role="tabpanel"]').innerText()
    const linkCount = await page.locator('[role="tabpanel"] a[target="_blank"][href^="/listings/"]').count()
    console.log('D15_PANEL_HAS_REPORTER', /Reported by/i.test(panelText))
    console.log('D15_PANEL_HAS_OPEN_COUNT', /open on this listing/i.test(panelText))
    console.log('D15_LISTING_LINKS', linkCount)
    console.log('D15_REASON_CHIPS', /Wrong device information|Misleading listing|Scam or fraud|Prohibited|Something else/i.test(panelText))

    const reportsTab = page.getByRole('tab', { name: /Reports/i })
    await reportsTab.focus()
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(800)
    const afterLeft = await page.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim())
    await page.screenshot({ path: 'screenshots/D15-03-arrow-left.png' })
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(800)
    const afterRight = await page.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim())
    console.log('D15_ARROW_LEFT_SELECTED', JSON.stringify(afterLeft))
    console.log('D15_ARROW_RIGHT_SELECTED', JSON.stringify(afterRight))

    expect(found.length, 'all six stat cards render').toBe(6)
    expect(rows.length, 'six cards fit without an orphan row').toBeLessThanOrEqual(2)
    expect(/Reported by/i.test(panelText), 'reporter name/email shown').toBe(true)
    expect(/open on this listing/i.test(panelText), 'openReportsForListing shown').toBe(true)
    expect(linkCount, 'listing link present').toBeGreaterThan(0)
    expect(afterLeft, 'ArrowLeft selects the previous tab').toMatch(/Pending Listings/i)
    expect(afterRight, 'ArrowRight returns to Reports').toMatch(/Reports/i)
    expectNoFatalErrors(all, 'D15')
  })

  test('D16 take down blocked without note, succeeds with note, listing leaves /browse', async ({ page, request }) => {
    const all = watchErrors(page)
    // Must be owned by seller@refon.test (ReFon Select) so the seller-side
    // assertions in the next test observe the take-down.
    const seeded = await apiReport(request, LISTINGS.iphone12, 'SCAM', 'Seller asked for an off-platform deposit.')
    console.log('D16_SEEDED_REPORT', seeded.status)

    await openReports(page)
    await page.screenshot({ path: 'screenshots/D16-01-reports-open.png' })

    const card = page.locator('article').filter({ hasText: /Apple\s*iPhone\s*12/i }).first()
    const exists = (await card.count()) > 0
    console.log('D16_TARGET_CARD', exists)
    await page.screenshot({ path: 'screenshots/D16-02-report-card.png' })

    await card.getByRole('button', { name: /Take down/i }).click()
    await page.waitForTimeout(1200)
    const blocked = await page.getByText(/why this listing is being taken down/i).count()
    const stillOnTab = await page.getByRole('tab', { name: /Reports/i }).isVisible()
    await page.screenshot({ path: 'screenshots/D16-03-takedown-blocked.png' })
    console.log('D16_BLOCKED_WITHOUT_NOTE', blocked > 0, 'STILL_ON_TAB', stillOnTab)

    await card.locator('textarea').fill('Reported for an off-platform deposit scam; pulled pending review.')
    await page.screenshot({ path: 'screenshots/D16-04-note-filled.png' })
    const resolveCalls = []
    page.on('response', (r) => {
      if (r.url().includes('/api/admin/reports')) {
        resolveCalls.push(`${r.request().method()} -> ${r.status()}`)
      }
    })
    await card.getByRole('button', { name: /Take down/i }).click()
    await page.waitForTimeout(3500)
    console.log('D16_RESOLVE_CALLS', JSON.stringify(resolveCalls))
    await page.screenshot({ path: 'screenshots/D16-05-after-takedown.png' })

    const notice = await page.getByText(/was taken down/i).count()
    const cardGone = (await page.locator('article').filter({ hasText: /Apple\s*iPhone\s*12/i }).count()) === 0
    console.log('D16_NOTICE', notice > 0, 'CARD_LEFT_OPEN_TAB', cardGone)

    // Searched rather than browsed: the catalog paginates, so a listing being
    // absent from page one is not evidence that it left the catalog.
    await showListing(page, 'iPhone 12')
    const stillListed = await page.getByRole('button', { name: /Save Apple iPhone 12/i }).count()
    await page.screenshot({ path: 'screenshots/D16-06-browse-after-takedown.png' })
    console.log('D16_LISTING_STILL_ON_BROWSE', stillListed > 0)

    expect(exists, 'target report card present').toBe(true)
    expect(blocked, 'take down blocked while note empty').toBeGreaterThan(0)
    expect(stillOnTab, 'reports tab still usable').toBe(true)
    expect(
      resolveCalls.length,
      'a note-filled take down must reach the API',
    ).toBeGreaterThan(0)
    expect(resolveCalls.some((c) => c.includes('200')), 'resolve returns 200').toBe(true)
    expect(notice, 'success notice shown').toBeGreaterThan(0)
    expect(cardGone, 'report leaves the Open tab').toBe(true)
    expect(stillListed, 'listing no longer on /browse').toBe(0)
    expectNoFatalErrors(all, 'D16')
  })

  test('D17 resolve and dismiss both notify the reporter; dismissed listing stays APPROVED', async ({ page, request }) => {
    const all = watchErrors(page)
    // Galaxy A54 gets a fresh report for the DISMISS path.
    const a54 = await apiReport(request, LISTINGS.galaxyA54, 'MISLEADING', 'Gallery photos are stock images.')
    console.log('D17_SEEDED_A54', a54.status)

    await openReports(page)

    // RESOLVE reuses the report D11 already created on Galaxy S21 (no extra API call).
    const s21 = page.locator('article').filter({ hasText: /Samsung\s*Galaxy\s*S21/i }).first()
    const s21Exists = (await s21.count()) > 0
    console.log('D17_S21_CARD_FOR_RESOLVE', s21Exists)
    if (s21Exists) {
      // Accessible names carry the phone ("Resolve Samsung Galaxy S21").
      await s21.getByRole('button', { name: /^Resolve\b/i }).click()
      await page.waitForTimeout(2400)
      await page.screenshot({ path: 'screenshots/D17-01-resolved.png' })
      const gone = (await page.locator('article').filter({ hasText: /Samsung\s*Galaxy\s*S21/i }).count()) === 0
      console.log('D17_RESOLVED_LEFT_OPEN_TAB', gone)
      expect(gone, 'resolved report leaves the Open tab').toBe(true)
    }

    const a54Card = page.locator('article').filter({ hasText: /Samsung\s*Galaxy\s*A54/i }).first()
    const a54Exists = (await a54Card.count()) > 0
    console.log('D17_A54_CARD', a54Exists)
    if (a54Exists) {
      await a54Card.locator('textarea').fill('Verified with the seller; the unit is legitimate.')
      await a54Card.getByRole('button', { name: /Dismiss/i }).click()
      await page.waitForTimeout(2400)
      await page.screenshot({ path: 'screenshots/D17-02-dismissed.png' })
    }

    // Each listing is searched for rather than expected on page one: the catalog
    // paginates to twelve results, so absence from the first page proves nothing
    // about whether a listing is still approved.
    await showListing(page, 'Galaxy A54')
    const a54Live = await page.locator('article').filter({ hasText: /Samsung\s*Galaxy\s*A54/i }).count()

    await showListing(page, 'Galaxy S21')
    const s21Live = await page.locator('article').filter({ hasText: /Samsung\s*Galaxy\s*S21/i }).count()
    await page.screenshot({ path: 'screenshots/D17-03-a54-still-listed.png' })
    console.log('D17_A54_STILL_APPROVED', a54Live > 0, 'S21_STILL_APPROVED', s21Live > 0)

    const notifications = await request.get('http://localhost:4000/api/notifications/mine', {
      headers: { Cookie: BUYER_COOKIE },
    })
    const resolved = (await notifications.json()).notifications.filter((n) => n.type === 'REPORT_RESOLVED')
    console.log('D17_REPORTER_NOTIFICATIONS', JSON.stringify(resolved.map((n) => n.message)))

    expect(s21Exists, 'Galaxy S21 report present for the resolve path').toBe(true)
    expect(a54Exists, 'A54 report card present for the dismiss path').toBe(true)
    expect(a54Live, 'dismissed listing stays APPROVED and browsable').toBeGreaterThan(0)
    expect(s21Live, 'resolved (non take-down) listing stays APPROVED').toBeGreaterThan(0)
    expect(
      resolved.some((n) => /found no violation/i.test(n.message)),
      'dismiss path message present',
    ).toBe(true)
    expect(
      resolved.some((n) => /removed the listing/i.test(n.message)),
      'resolve/take-down path message present',
    ).toBe(true)
    expectNoFatalErrors(all, 'D17')
  })
})

test.describe('D16 notifications and dashboard', () => {
  test.use({ storageState: 'state/seller.json' })

  test('D16 seller bell shows LISTING_TAKEN_DOWN with the note and dashboard shows Rejected', async ({ page }) => {
    const all = watchErrors(page)
    // No API fallback here: the take-down must have been performed by the UI in the
    // previous test, so these assertions prove the whole path end to end.
    await page.goto('/seller')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(1800)
    await page.screenshot({ path: 'screenshots/D16-07-seller-dashboard.png' })
    const dash = await page.locator('body').innerText()
    // innerText follows the uppercase styling, so the match ignores case.
    const rejected = /Rejected/i.test(dash)
    const feedback = /off-platform deposit scam/i.test(dash)
    console.log('D16_DASH_REJECTED', rejected, 'FEEDBACK_SHOWN', feedback)

    await page.getByRole('button', { name: /Notifications/i }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: 'screenshots/D16-08-seller-bell.png' })
    const bell = await page.getByRole('dialog').innerText()
    const takenDown = /taken down after a buyer report/i.test(bell)
    const note = /off-platform deposit scam/i.test(bell)
    console.log('D16_BELL_TAKENDOWN', takenDown, 'NOTE_IN_BELL', note)

    expect(takenDown, 'seller bell shows LISTING_TAKEN_DOWN').toBe(true)
    expect(note, 'note appears in the notification').toBe(true)
    expect(rejected, 'dashboard shows the listing as Rejected').toBe(true)
    expect(feedback, 'dashboard shows the moderator feedback').toBe(true)
    expectNoFatalErrors(all, 'D16-seller')
  })
})

test.describe('D16 buyer bell', () => {
  test.use({ storageState: 'state/buyer.json' })

  test('D16 buyer bell shows REPORT_RESOLVED', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/browse')
    await page.getByRole('button', { name: /Notifications/i }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/D16-09-buyer-bell.png' })
    const bell = await page.getByRole('dialog').innerText()
    const resolved = /removed the listing/i.test(bell)
    console.log('D16_BUYER_BELL_REPORT_RESOLVED', resolved)
    expect(resolved, 'buyer bell shows REPORT_RESOLVED').toBe(true)
    expectNoFatalErrors(all, 'D16-buyer')
  })
})

test.describe('D18 seller rejection reason', () => {
  test.use({ storageState: 'state/admin.json' })

  test('D18 admin rejects the new seller with a reason', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/admin')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(1500)
    const sellersTab = page.getByRole('tab', { name: /Pending Sellers/i })
    await sellersTab.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'screenshots/D18-01-pending-sellers.png' })

    const card = page.locator('article').filter({ hasText: /E2E Seller/i }).first()
    const exists = (await card.count()) > 0
    console.log('D18_APPLICANT_CARD', exists)
    if (exists) {
      const textarea = card.locator('textarea')
      const hasTextarea = (await textarea.count()) > 0
      console.log('D18_SELLER_FEEDBACK_TEXTAREA', hasTextarea)
      await page.screenshot({ path: 'screenshots/D18-02-seller-feedback-field.png' })
      if (hasTextarea) {
        await textarea.fill('Business registration number could not be verified.')
      }
      await card.getByRole('button', { name: /^Reject\b/i }).click()
      await page.waitForTimeout(2200)
      await page.screenshot({ path: 'screenshots/D18-03-after-reject.png' })
    }
    expect(exists, 'new seller application visible to admin').toBe(true)
    expectNoFatalErrors(all, 'D18-admin')
  })
})

test.describe('D18 applicant view', () => {
  test.use({ storageState: 'state/sellerApplicant.json' })

  test('D18 applicant sees Reason in the red banner and re-apply clears it', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto('/seller')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(1600)
    await page.screenshot({ path: 'screenshots/D18-04-applicant-rejected.png' })
    const dash = await page.locator('body').innerText()
    const rejected = /Verification rejected/i.test(dash)
    const reason = /Reason:.*Business registration number could not be verified/i.test(dash.replace(/\s+/g, ' '))
    console.log('D18_APPLICANT_REJECTED', rejected, 'REASON_SHOWN', reason)
    expect(rejected, 'applicant sees the rejected banner').toBe(true)
    expect(reason, 'banner includes Reason: ...').toBe(true)

    // Re-apply clears it. The dashboard link goes to the create form; use the API for determinism.
    await page.request.post('http://localhost:4000/api/sellers/apply', {
      data: { businessName: 'E2E Seller', contactInfo: 'e2e-applicant@example.test' },
    })
    await page.reload()
    await page.waitForTimeout(1800)
    await page.screenshot({ path: 'screenshots/D18-05-after-reapply.png' })
    const after = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    const cleared = !/Reason:.*Business registration number/i.test(after)
    const pending = /Verification pending/i.test(after)
    console.log('D18_AFTER_REAPPLY_PENDING', pending, 'REASON_CLEARED', cleared)
    expect(cleared, 're-apply clears the rejection reason').toBe(true)
    expect(pending, 're-apply returns the applicant to pending').toBe(true)
    expectNoFatalErrors(all, 'D18-applicant')
  })
})

test.describe('D19 mobile admin', () => {
  test.use({ storageState: 'state/admin.json' })

  test('D19 admin on 375x812: tabs usable, no horizontal scroll', async ({ page }) => {
    const all = watchErrors(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin')
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(1600)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    await page.screenshot({ path: 'screenshots/D19-01-admin-mobile.png' })

    const reportsTab = page.getByRole('tab', { name: /Reports/i })
    const tabVisible = await reportsTab.isVisible()
    if (tabVisible) {
      await reportsTab.click()
      await page.waitForTimeout(1600)
    }
    await page.screenshot({ path: 'screenshots/D19-02-admin-reports-mobile.png' })
    const overflowAfter = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    console.log('D19_OVERFLOW_OVERVIEW', overflow, 'OVERFLOW_REPORTS', overflowAfter, 'TAB_VISIBLE', tabVisible)

    expect(tabVisible, 'Reports tab usable on mobile').toBe(true)
    expect(overflow, 'admin overview has no horizontal scroll').toBeLessThanOrEqual(1)
    expect(overflowAfter, 'reports tab has no horizontal scroll').toBeLessThanOrEqual(1)
    expectNoFatalErrors(all, 'D19')
  })
})
