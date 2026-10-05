import { test, expect } from '@playwright/test'
import {
  tryClickHeart,
  heartIsTopmost,
  savedBadge,
  showListing,
  watchErrors,
  expectNoFatalErrors,
} from './support.js'
import { LISTINGS, openListing } from './constants.js'

// C1 runs signed out.
test.use({ storageState: { cookies: [], origins: [] } })

test('C1 anonymous browse shows cards+hearts, heart click goes to /login and returns', async ({ page }) => {
  const all = watchErrors(page)
  await page.goto('/browse')
  await page.locator('article').first().waitFor()
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'screenshots/C1-01-anon-browse.png' })

  const cards = await page.locator('article').count()
  const hearts = await page.locator('button[aria-label^="Save "]').count()
  console.log('C1_CARDS', cards, 'C1_HEARTS', hearts)
  expect(cards, 'cards render').toBeGreaterThan(0)
  expect(hearts, 'hearts visible when anonymous').toBeGreaterThan(0)

  await showListing(page, 'Redmi Note 12')
  const result = await tryClickHeart(page, 'Xiaomi Redmi Note 12')
  await page.screenshot({ path: 'screenshots/C1-02-after-heart-click.png' })
  console.log('C1_CLICK', JSON.stringify(result))

  expect(
    result.clicked,
    `heart is clickable when anonymous (click error: ${result.clickError})`,
  ).toBe(true)
  expect(new URL(result.urlAfter).pathname, 'anonymous heart click lands on /login').toBe('/login')

  await page.locator('#email').fill('seller@refon.test')
  await page.locator('#password').fill('SellerTest123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForFunction(() => !location.pathname.includes('/login'), null, { timeout: 25_000 })
  await page.screenshot({ path: 'screenshots/C1-03-after-login-return.png' })
  console.log('C1_RETURNED_TO', page.url())
  expectNoFatalErrors(all, 'C1')
})

test.describe('signed-in buyer', () => {
  test.use({ storageState: 'state/buyer.json' })

  test('C2 buyer heart: aria-pressed, no navigation, badge increments, heart topmost', async ({ page }) => {
    const all = watchErrors(page)
    await showListing(page, 'Redmi Note 12')

    const name = 'Xiaomi Redmi Note 12'
    const before = await savedBadge(page)
    const topmost = await heartIsTopmost(page, name)
    await page.screenshot({ path: 'screenshots/C2-01-browse-before-click.png' })
    console.log('C2_TOPMOST', JSON.stringify(topmost))

    const result = await tryClickHeart(page, name)
    await page.screenshot({ path: 'screenshots/C2-02-after-click.png' })

    const pressed = await page.locator('button[aria-pressed="true"]').count()
    const after = await savedBadge(page)
    console.log('C2_CLICK', JSON.stringify(result))
    console.log('C2_BADGE', before, '->', after, 'PRESSED', pressed)

    expect(topmost.heartIsTopmost, `heart must be topmost at its centre (found ${topmost.topmostTag})`).toBe(true)
    expect(result.clicked, `heart must be clickable (click error: ${result.clickError})`).toBe(true)
    expect(result.urlAfter, 'URL must not change').toBe(result.urlBefore)
    expect(pressed, 'aria-pressed becomes true').toBeGreaterThan(0)
    expect(after, 'Saved badge increments').toBe(before + 1)
    expectNoFatalErrors(all, 'C2')
  })

  test('C3 save 3, unsave 1, state and badge persist across reload', async ({ page }) => {
    const all = watchErrors(page)
    // The catalog paginates to twelve results, so a seeded listing is not always
    // on page one. Each card below is reached through a filtered search rather
    // than by assuming it appears in the first page.
    //
    // These three are untouched by the other tests in this file: C2 saves Xiaomi
    // Redmi Note 12, C4 Galaxy S21, C5 iPhone 13, C9 iPhone 8, C10 Redmi Note 9.
    const names = ['OPPO Reno 8', 'Samsung Galaxy S8', 'Samsung Galaxy A54']

    // Land on a real page before reading the badge, which reads the header.
    await page.goto('/phones')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(700)

    // The badge is cumulative for this user across the whole file, so measure
    // relative to the starting value rather than an absolute number.
    const badgeStart = await savedBadge(page)
    const attempts = []

    for (const name of names) {
      await showListing(page, name)
      attempts.push({ name, ...(await tryClickHeart(page, name)) })
    }
    await page.screenshot({ path: 'screenshots/C3-01-three-saved.png' })
    const badgeAfter3 = await savedBadge(page)
    console.log('C3_ATTEMPTS', JSON.stringify(attempts))
    console.log('C3_BADGE', badgeStart, '->', badgeAfter3)

    // Unsave the last one that was saved. Which listing that is depends on the
    // order the loop above visited them, so the label is read rather than
    // assumed. The label reads "Remove Save <brand> <model>" once pressed, so
    // both prefixes are stripped to recover the "brand model" name.
    const removeBtn = page.locator('button[aria-pressed="true"]').first()
    const removeLabel = await removeBtn.getAttribute('aria-label')
    const removedName =
      removeLabel?.replace(/^Remove\s+/, '').replace(/^Save\s+/, '') ?? ''
    let unsaveError = null
    try {
      await removeBtn.click({ timeout: 4000 })
    } catch (error) {
      unsaveError = error.message.split('\n')[0]
    }
    await page.waitForTimeout(1300)
    await page.screenshot({ path: 'screenshots/C3-02-after-unsave.png' })
    const badgeAfter2 = await savedBadge(page)
    console.log('C3_UNSAVED', removeLabel, 'error', unsaveError, 'badge', badgeAfter2)

    // Persistence is checked against /saved rather than the current results
    // page: the catalog paginates, so the current page may hold only the one
    // card that was just unsaved.
    await page.goto('/saved')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(1100)
    await page.screenshot({ path: 'screenshots/C3-03-after-reload.png' })
    const badgeAfterReload = await savedBadge(page)
    const savedNames = (await page.locator('article h3').allInnerTexts()).join(' | ')
    console.log('C3_BADGE_AFTER_RELOAD', badgeAfterReload, 'SAVED', savedNames)

    expect(attempts.every((a) => a.clicked), `all three hearts clickable (${JSON.stringify(attempts.map((a) => a.clickError))})`).toBe(true)
    expect(badgeAfter3, 'badge gains 3').toBe(badgeStart + 3)
    expect(unsaveError, `unsave clickable (error: ${unsaveError})`).toBeNull()
    expect(badgeAfter2, 'badge loses 1 after unsave').toBe(badgeStart + 2)
    expect(badgeAfterReload, 'badge persists after reload').toBe(badgeStart + 2)

    // Card headings hold the model only, so compare against the model half of each
    // "brand model" name.
    const stillSaved = names
      .filter((name) => name !== removedName)
      .map((name) => name.replace(/^\S+\s+/, ''))

    for (const model of stillSaved) {
      expect(savedNames, `${model} stays saved`).toContain(model)
    }

    // Reload confirms the cards were read from the server, not left in memory.
    await page.reload()
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(1100)
    const afterReload = (await page.locator('article h3').allInnerTexts()).join(' | ')
    for (const model of stillSaved) {
      expect(afterReload, `${model} survives a reload`).toContain(model)
    }

    const removedModel = removedName.replace(/^\S+\s+/, '')
    expect(afterReload, 'the unsaved listing is gone').not.toContain(removedModel)
    expectNoFatalErrors(all, 'C3')
  })

  test('C4 /saved lists saved cards without hearts, empty state has Browse phones', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/saved')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    await page.screenshot({ path: 'screenshots/C4-01-populated-or-empty.png' })
    const browseLinkCount = await page.getByRole('link', { name: /Browse phones/i }).count()
    console.log('C4_BROWSE_LINK_COUNT', browseLinkCount)

    await openListing(page, LISTINGS.galaxyS21)
    const saveResult = await tryClickHeart(page, 'Samsung Galaxy S21')
    await page.screenshot({ path: 'screenshots/C4-02-detail-saved.png' })
    console.log('C4_SAVE_CLICK', JSON.stringify(saveResult))

    await page.goto('/saved')
    await page.locator('article').first().waitFor()
    await page.waitForTimeout(900)
    await page.screenshot({ path: 'screenshots/C4-03-one-saved.png' })
    const cards = await page.locator('article').count()
    const hearts = await page.locator('button[aria-label^="Save "]').count()
    console.log('C4_CARDS', cards, 'C4_HEARTS', hearts)

    expect(saveResult.clicked, `detail heart clickable (error: ${saveResult.clickError})`).toBe(true)
    expect(cards, 'saved card rendered').toBeGreaterThan(0)
    expect(hearts, 'no hearts on /saved cards').toBe(0)
    expectNoFatalErrors(all, 'C4')
  })

  test('C5 listing detail heart matches card state', async ({ page }) => {
    const all = watchErrors(page)

    await openListing(page, LISTINGS.iphone13)
    const result = await tryClickHeart(page, 'Apple iPhone 13')
    await page.screenshot({ path: 'screenshots/C5-01-detail-heart-saved.png' })
    const pressedOnDetail = await page.locator('button[aria-pressed="true"]').count()
    console.log('C5_DETAIL_CLICK', JSON.stringify(result), 'PRESSED', pressedOnDetail)

    // Searched rather than browsed: the catalog paginates, so the iPhone 13 card
    // is not guaranteed to be in the first page of results.
    await showListing(page, 'iPhone 13')
    const cardState = await page.evaluate(() =>
      [...document.querySelectorAll('article button[aria-pressed]')].map((b) => ({
        label: b.getAttribute('aria-label'),
        pressed: b.getAttribute('aria-pressed'),
      })),
    )
    await page.screenshot({ path: 'screenshots/C5-02-card-state.png' })
    const matching = cardState.find((s) => /iPhone 13/.test(s.label || ''))
    console.log('C5_CARD_STATE', JSON.stringify(cardState))

    expect(result.clicked, `detail heart clickable (error: ${result.clickError})`).toBe(true)
    expect(pressedOnDetail, 'detail heart shows saved').toBeGreaterThan(0)
    expect(matching, 'card heart exists for the saved listing').toBeTruthy()
    expect(matching.pressed, 'card heart is pressed too').toBe('true')
    expectNoFatalErrors(all, 'C5')
  })

  test('C6 send inquiry, /my-inquiries shows link, price, message, Available chip', async ({ page }) => {
    const all = watchErrors(page)
    await openListing(page, LISTINGS.galaxyS8)

    await page.getByRole('button', { name: /Inquire Now/i }).first().click()
    await page.getByRole('dialog').waitFor()
    await page.screenshot({ path: 'screenshots/C6-01-inquiry-modal.png' })
    await page.locator('#inquiry-name').fill('E2E Buyer')
    await page.locator('#inquiry-contact').fill('e2e-buyer@example.test')
    await page.getByRole('button', { name: /Send inquiry/i }).click()
    await page.waitForTimeout(1700)
    await page.screenshot({ path: 'screenshots/C6-02-inquiry-sent.png' })

    await page.goto('/my-inquiries')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    await page.screenshot({ path: 'screenshots/C6-03-my-inquiries.png' })
    const text = await page.locator('body').innerText()
    console.log('C6_HAS_AVAILABLE_CHIP', /Available/.test(text), 'C6_HAS_PRICE', /₱/.test(text))

    await expect(page.locator(`a[href="/listings/${LISTINGS.galaxyS8}"]`), 'listing link').toHaveCount(1)
    await expect(page.getByText('Available').first(), 'Available chip').toBeVisible()
    await expect(page.getByText(/₱/).first(), 'price').toBeVisible()
    await expect(page.getByText(/interested in this Samsung Galaxy S8/i).first(), 'my message').toBeVisible()
    expectNoFatalErrors(all, 'C6')
  })

  test('C9 mobile 375x812: nav links + badge, no horizontal scroll', async ({ page }) => {
    const all = watchErrors(page)
    await page.setViewportSize({ width: 375, height: 812 })

    // iPhone 8 is never taken down by the admin-2 suite, so it stays APPROVED here.
    await openListing(page, LISTINGS.iphone8)
    const saveResult = await tryClickHeart(page, 'Apple iPhone 8')
    console.log('C9_SAVE', JSON.stringify(saveResult))

    for (const [name, path] of [['browse', '/browse'], ['saved', '/saved'], ['myinquiries', '/my-inquiries']]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      await page.screenshot({ path: `screenshots/C9-01-${name}-mobile.png` })
      console.log(`C9_OVERFLOW_${name.toUpperCase()}`, overflow)
      expect(overflow, `${path} has no horizontal scroll`).toBeLessThanOrEqual(1)
    }

    await page.goto('/browse')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Open navigation menu/i }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/C9-02-mobile-menu.png' })

    // /browse renders inside MarketplaceHeader, whose nav panel has this id.
    const savedLink = page.locator('#marketplace-mobile-navigation a[href="/saved"]')
    const inqLink = page.locator('#marketplace-mobile-navigation a[href="/my-inquiries"]')
    const savedVisible = await savedLink.isVisible().catch(() => false)
    const inqVisible = await inqLink.isVisible().catch(() => false)
    const badge = savedVisible ? await savedLink.innerText() : ''
    const clipped = savedVisible
      ? await savedLink.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return r.right > window.innerWidth + 1 || r.left < -1
        })
      : true
    console.log('C9_SAVED_VISIBLE', savedVisible, 'INQ_VISIBLE', inqVisible, 'BADGE', JSON.stringify(badge), 'CLIPPED', clipped)

    expect(saveResult.clicked, `heart clickable on mobile (error: ${saveResult.clickError})`).toBe(true)
    expect(savedVisible, 'mobile menu shows Saved').toBe(true)
    expect(inqVisible, 'mobile menu shows My Inquiries').toBe(true)
    expect(badge, 'badge shows a positive count').toMatch(/[1-9]/)
    expect(clipped, 'Saved link is not clipped').toBe(false)
    expectNoFatalErrors(all, 'C9')
  })

  test('C10 keyboard: focus ring visible, Enter/Space toggle', async ({ page }) => {
    const all = watchErrors(page)
    // Redmi Note 9 is not touched by any other test in this file, so it is still
    // unsaved when the keyboard test reaches it. Found by search because the
    // catalog paginates.
    await showListing(page, 'Redmi Note 9')

    const heart = page.locator('button[aria-label="Save Xiaomi Redmi Note 9"]')
    await heart.focus()
    await page.screenshot({ path: 'screenshots/C10-01-heart-focused.png' })

    const ring = await heart.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow }
    })
    const ringVisible =
      (ring.outlineStyle !== 'none' && parseFloat(ring.outlineWidth) > 0) ||
      (ring.boxShadow !== 'none' && ring.boxShadow.length > 0)
    console.log('C10_RING', JSON.stringify(ring), 'VISIBLE', ringVisible)

    await page.keyboard.press('Enter')
    await page.waitForTimeout(1300)
    await page.screenshot({ path: 'screenshots/C10-02-after-enter.png' })
    const afterEnter = await page.locator('button[aria-pressed="true"]').count()
    // The button must keep keyboard focus across the save request.
    const focusAfterEnter = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return 'BODY'
      return `${el.tagName}:${el.getAttribute?.('aria-label') ?? ''}`
    })

    await page.keyboard.press(' ')
    await page.waitForTimeout(1300)
    await page.screenshot({ path: 'screenshots/C10-03-after-space.png' })
    const afterSpace = await page.locator('button[aria-pressed="true"]').count()
    const focusAfterSpace = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return 'BODY'
      return `${el.tagName}:${el.getAttribute?.('aria-label') ?? ''}`
    })
    console.log('C10_PRESSED after Enter', afterEnter, 'after Space', afterSpace)
    console.log('C10_FOCUS_AFTER_ENTER', JSON.stringify(focusAfterEnter))
    console.log('C10_FOCUS_AFTER_SPACE', JSON.stringify(focusAfterSpace))

    expect(ringVisible, 'focus ring visible on the heart').toBe(true)
    expect(afterEnter, 'Enter toggles the heart on').toBeGreaterThan(0)
    expect(focusAfterEnter, 'focus stays on the heart after Enter').toMatch(
      /^BUTTON:.*Redmi Note 9/,
    )
    expect(afterSpace, 'Space toggles the heart off').toBe(afterEnter - 1)
    expect(focusAfterSpace, 'focus stays on the heart after Space').toMatch(
      /^BUTTON:.*Redmi Note 9/,
    )
    expectNoFatalErrors(all, 'C10')
  })
})
