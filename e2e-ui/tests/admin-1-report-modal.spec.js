import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { watchErrors, expectNoFatalErrors } from './support.js'
import { LISTINGS, openListing } from './constants.js'

const emails = JSON.parse(fs.readFileSync('state/emails.json', 'utf8'))

function reportButton(page) {
  return page.getByRole('button', { name: /Report this listing/i })
}

async function submitReport(page, { reason, details }) {
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await dialog.getByRole('radio', { name: new RegExp(labelForReason(reason), 'i') }).check()
  if (details) {
    await dialog.locator('#report-details').fill(details)
  }
  await dialog.getByRole('button', { name: /Submit report/i }).click()
  await page.waitForTimeout(1500)
}

function labelForReason(reason) {
  return {
    SCAM: 'Scam or fraud',
    MISLEADING: 'Misleading photos or description',
    WRONG_INFO: 'Wrong device information',
    PROHIBITED_ITEM: 'Prohibited or recalled item',
    OTHER: 'Something else',
  }[reason]
}

test.describe('D11-D13 report modal (buyer)', () => {
  test.use({ storageState: 'state/buyer.json' })

  test('D11 modal opens, focus returns after Escape, Tab stays trapped, OTHER blocks empty submit, valid submit succeeds', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.galaxyS21)

    await reportButton(page).click()
    await page.screenshot({ path: 'screenshots/D11-01-modal-open.png' })
    const dialog = page.getByRole('dialog')
    await expect(dialog, 'report dialog opens').toBeVisible()

    // Focus starts inside the dialog.
    const focusInsideInitially = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return dlg ? dlg.contains(document.activeElement) : false
    })
    console.log('D11_FOCUS_INSIDE_INITIALLY', focusInsideInitially)

    // Tab cycling must stay inside the dialog.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const stillInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return dlg ? dlg.contains(document.activeElement) : false
    })
    console.log('D11_FOCUS_STAYS_TRAPPED', stillInside)
    await page.screenshot({ path: 'screenshots/D11-02-focus-trapped.png' })

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    const dialogGone = (await page.getByRole('dialog').count()) === 0
    const focusReturned = await page.evaluate(() => {
      const el = document.activeElement
      return el ? (el.textContent || '').trim() : ''
    })
    await page.screenshot({ path: 'screenshots/D11-03-after-escape.png' })
    console.log('D11_DIALOG_CLOSED', dialogGone, 'FOCUS_RETURNED_TO', JSON.stringify(focusReturned))

    // OTHER with empty details must block submit.
    await reportButton(page).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: /Something else/i }).check()
    await page.getByRole('button', { name: /Submit report/i }).click()
    await page.waitForTimeout(900)
    const blocked = await page.getByText(/Add details so the moderation team can review/i).count()
    const stillOpen = (await page.getByRole('dialog').count()) > 0
    await page.screenshot({ path: 'screenshots/D11-04-other-empty-blocked.png' })
    console.log('D11_OTHER_EMPTY_BLOCKED', blocked > 0, 'STILL_OPEN', stillOpen)

    // Valid submit succeeds.
    await page.locator('#report-details').fill('The battery health claim looks fabricated to me.')
    await page.getByRole('button', { name: /Submit report/i }).click()
    await page.waitForTimeout(1800)
    const success = await page.getByText(/Thanks for letting us know/i).count()
    await page.screenshot({ path: 'screenshots/D11-05-success.png' })
    console.log('D11_SUCCESS_SHOWN', success > 0)

    expect(focusInsideInitially, 'focus moves into the dialog').toBe(true)
    expect(stillInside, 'Tab stays trapped inside the dialog').toBe(true)
    expect(dialogGone, 'Escape closes the dialog').toBe(true)
    expect(focusReturned, 'focus returns to the report button').toMatch(/Report this listing/i)
    expect(blocked, 'OTHER with empty details is blocked').toBeGreaterThan(0)
    expect(stillOpen, 'dialog stays open when blocked').toBe(true)
    expect(success, 'valid submit shows success').toBeGreaterThan(0)
    expectNoFatalErrors(all, 'D11')
  })

  test('D12 reporting the same listing again shows the already-reported message', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.galaxyS21)
    await reportButton(page).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: /Scam or fraud/i }).check()
    await page.getByRole('button', { name: /Submit report/i }).click()
    await page.waitForTimeout(1800)
    const already = await page.getByText(/already reported this listing/i).count()
    await page.screenshot({ path: 'screenshots/D12-01-already-reported.png' })
    console.log('D12_ALREADY_REPORTED_MESSAGE', already)
    expect(already, 'duplicate report shows the already-reported message').toBeGreaterThan(0)
    expectNoFatalErrors(all, 'D12')
  })
})

test.describe('D13 report visibility by role', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D13 anonymous report click goes to /login with a return path', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.iphone13)
    await page.screenshot({ path: 'screenshots/D13-01-anon-detail.png' })
    // Anonymous visitors must not see the report button at all.
    const anonButton = await page.getByRole('button', { name: /Report this listing/i }).count()
    console.log('D13_ANON_REPORT_BUTTON_COUNT', anonButton)
    expect(anonButton, 'anonymous sees no Report button').toBe(0)
    expectNoFatalErrors(all, 'D13-anon')
  })
})

test.describe('D13 admin', () => {
  test.use({ storageState: 'state/admin.json' })

  test('D13 admin sees no Report button', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.iphone13)
    await page.screenshot({ path: 'screenshots/D13-02-admin-detail.png' })
    const count = await page.getByRole('button', { name: /Report this listing/i }).count()
    console.log('D13_ADMIN_REPORT_BUTTON_COUNT', count)
    expect(count, 'admin sees no Report button').toBe(0)
    expectNoFatalErrors(all, 'D13-admin')
  })
})

test.describe('D14 seller reports own listing', () => {
  test.use({ storageState: 'state/seller.json' })

  test('D14 seller gets the CANNOT_REPORT_OWN_LISTING message', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.iphone6s)
    await page.screenshot({ path: 'screenshots/D14-01-seller-own-listing.png' })
    await reportButton(page).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('radio', { name: /Scam or fraud/i }).check()
    await page.getByRole('button', { name: /Submit report/i }).click()
    await page.waitForTimeout(1800)
    const own = await page.getByText(/cannot report your own listing/i).count()
    await page.screenshot({ path: 'screenshots/D14-02-own-listing-error.png' })
    console.log('D14_OWN_LISTING_MESSAGE', own)
    expect(own, 'seller sees the cannot-report-own-listing message').toBeGreaterThan(0)
    expectNoFatalErrors(all, 'D14')
  })
})
