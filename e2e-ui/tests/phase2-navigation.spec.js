/**
 * Phase 2 verification: navbar, search overlay, cart drawer, and footer.
 *
 * Deliberately narrower than the Phase 1 spec. This file asserts the behaviour
 * the brief lists and nothing about page content, and it is paired with a short
 * smoke set (`tests/phase2-smoke.spec.js`) rather than the full suite — the full
 * suite is Phase 1's regression baseline and re-running it here would cost an
 * hour to learn nothing new about the navbar.
 *
 * Conventions inherited from the existing suite:
 *   - anonymous-session and permission failures (401 / 403 / 422) are recorded
 *     but not fatal, because the app asks for them on purpose;
 *   - a backend that is down is reported separately from a frontend defect.
 */
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isNoise } from './support.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '..', '..', 'frontend')
const SHOTS = path.resolve(HERE, '..', 'qa', 'shots', 'phase2')
const AXE = path.join(HERE, '..', 'node_modules', 'axe-core', 'axe.min.js')

const PRODUCT_PATH = '/listings/40000000-0000-4000-8000-000000000004'
/** An iPhone 6s at ₱4,900 — under the ₱15,000 free-delivery threshold. */
const CHEAP_PRODUCT_PATH = '/listings/40000000-0000-4000-8000-000000000001'
/** A Redmi Note 9 at ₱6,490. 4900 + 6490 = 11,390, still under the threshold. */
const SECOND_CHEAP_PRODUCT_PATH = '/listings/40000000-0000-4000-8000-000000000018'
const API = process.env.REFON_API ?? 'http://localhost:4000/api'

/**
 * Empties the cart and releases every reservation it holds.
 *
 * A cart belongs to an account, and the tests below all run as the same buyer, so a
 * discarded browser context does not discard the cart: the row and its live
 * 15-minute reservation on a real device survive into the next test, which is then
 * refused the same device with `LISTING_RESERVED` (409). That reads as an
 * application bug and is not one.
 *
 * `cart-checkout.spec.js` documents the same trap and clears in `afterEach`. This
 * clears in both directions: before, because the first test of a run inherits
 * whatever a previous *run* left behind, and after, so this run does not become
 * the next run's problem.
 */
async function clearCart(page) {
  const response = await page.request.delete(`${API}/cart`).catch(() => null)

  if (response && response.status() !== 200) {
    throw new Error(`clearCart expected 200, got ${response.status()}`)
  }
}

/* ------------------------------------------------------------------ helpers */

const LIBRARY_NOISE = [
  /You have Reduced Motion enabled on your device\. Animations may not appear as expected/i,
]

function watch(page) {
  const console_ = []
  const pageErrors = []
  const failedRequests = []
  const badResponses = []
  const apiDown = []

  page.on('console', (message) => {
    const type = message.type()
    if (type === 'error' || type === 'warning') {
      console_.push({ type, text: message.text() })
    }
  })

  page.on('pageerror', (error) => pageErrors.push(error.message))

  page.on('requestfailed', (request) => {
    const entry = { url: request.url(), reason: request.failure()?.errorText ?? 'unknown' }

    if (/\/api\//.test(entry.url) && /ERR_CONNECTION_REFUSED|ERR_NETWORK_CHANGED/.test(entry.reason)) {
      apiDown.push(entry)
      return
    }

    // Every data hook mounts an AbortController, so StrictMode's double-mount
    // and every navigation produce one. That is cleanup, not failure.
    if (/ERR_ABORTED/.test(entry.reason)) {
      return
    }

    failedRequests.push(entry)
  })

  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ url: response.url(), status: response.status() })
    }
  })

  return { console_, pageErrors, failedRequests, badResponses, apiDown }
}

function unexpected(bucket) {
  const notes = []

  for (const entry of bucket.console_) {
    const allowed = isNoise(entry.text) || LIBRARY_NOISE.some((p) => p.test(entry.text))
    if (!allowed) notes.push(`console.${entry.type}: ${entry.text}`)
  }

  for (const entry of bucket.pageErrors) notes.push(`pageerror: ${entry}`)

  for (const entry of bucket.failedRequests) {
    notes.push(`requestfailed: ${entry.url} (${entry.reason})`)
  }

  for (const entry of bucket.badResponses) {
    if ([401, 403, 409, 422].includes(entry.status)) continue
    notes.push(`http ${entry.status}: ${entry.url}`)
  }

  return notes
}

/** Scrolls the window and waits for Lenis to finish easing. */
async function scrollTo(page, y) {
  await page.evaluate((target) => window.scrollTo(0, target), y)
  await page.waitForFunction(
    () => new Promise((resolve) => {
      let stable = 0
      let last = window.scrollY
      const tick = () => {
        if (window.scrollY === last) stable += 1
        else stable = 0
        last = window.scrollY
        if (stable >= 4) resolve(true)
        else window.requestAnimationFrame(tick)
      }
      window.requestAnimationFrame(tick)
    }),
    undefined,
    { timeout: 6000, polling: 60 },
  )
}

/**
 * Adds one phone to the cart and waits for the badge to catch up.
 *
 * `navigate: false` is for callers that need to observe the write from inside the
 * page — a sampler installed on the current document is discarded by the `goto`
 * below, which silently turned the bounce assertion into a zero-sample pass.
 */
async function addToCart(page, { before = null, navigate = true, path = PRODUCT_PATH } = {}) {
  const labelBefore =
    before ?? (await page.getByTestId('navbar-cart').getAttribute('aria-label'))

  if (navigate) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
  }

  await page.getByRole('button', { name: /add to cart/i }).first().click()

  await expect
    .poll(async () => await page.getByTestId('navbar-cart').getAttribute('aria-label'), {
      timeout: 20_000,
    })
    .not.toBe(labelBefore)

  await page.waitForTimeout(400)
}

/**
 * Records the cart subtotal's text every frame into `window.__subtotals`.
 *
 * Re-reads the node on each frame rather than capturing it once: removing the
 * last line unmounts the footer entirely, and a captured node would keep
 * reporting its final text forever — which is how the first version of this check
 * saw one distinct value and looked like a broken counter.
 */
async function startSubtotalSampler(page) {
  await page.evaluate(() => {
    window.__subtotals = []
    const started = performance.now()

    const tick = () => {
      const node = document.querySelector('[data-testid="cart-subtotal"]')
      if (node) window.__subtotals.push(node.textContent.trim())
      if (performance.now() - started < 4000) window.requestAnimationFrame(tick)
    }

    window.requestAnimationFrame(tick)
  })
}

/**
 * Starts an in-page sampler that records the cart badge's scale every frame.
 *
 * The bounce is 300ms long and starts the moment the badge mounts, so a poll or a
 * screenshot taken after the write lands has already missed it. Sampling has to
 * be running *before* the click, from inside the page, or the peak is gone.
 */
async function startBadgeSampler(page) {
  await page.evaluate(() => {
    window.__badgeScales = []

    const tick = () => {
      const node = document.querySelector('[data-testid="navbar-cart-badge"]')
      if (node) {
        const style = getComputedStyle(node)
        window.__badgeScales.push(
          style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).a,
        )
      }
      window.requestAnimationFrame(tick)
    }

    window.requestAnimationFrame(tick)
  })
}

async function readBadgeSampler(page) {
  return page.evaluate(() => window.__badgeScales ?? [])
}

/** Injects axe-core and returns its serious/critical violations. */
async function runAxe(page, selector) {
  const source = fs.readFileSync(AXE, 'utf8')

  await page.evaluate(source)

  return page.evaluate(async (target) => {
    const results = await window.axe.run(target, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })

    return results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.slice(0, 3).map((node) => ({
          target: node.target.join(' '),
          summary: node.failureSummary?.split('\n').slice(0, 2).join(' '),
        })),
      }))
  }, selector)
}

/* -------------------------------------------------------------------- tests */

test.describe('P2 navigation foundation', () => {
  // The cart, the drawer and the add-to-cart flow are buyer surfaces, so these tests
  // need a buyer. Signing in is not part of what P2-06 through P2-09b are checking,
  // so the session comes from `globalSetup` rather than from the test.
  test.use({ storageState: 'state/buyer.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await clearCart(page)
  })

  test.afterEach(async ({ page }) => {
    await clearCart(page)
  })

  test('P2-01 the production build succeeds and ships no external font CDN', async () => {
    let output = ''
    let failed = false

    try {
      output = execSync('npm run build', {
        cwd: FRONTEND,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300_000,
      })
    } catch (error) {
      failed = true
      output = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message}`
    }

    expect(output).not.toMatch(/\[vite\]: .*error|Internal server error|Error:|SyntaxError/)
    expect(failed, output).toBe(false)

    const dist = path.join(FRONTEND, 'dist')
    expect(fs.existsSync(path.join(dist, 'index.html'))).toBe(true)

    const files = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(js|css|html)$/.test(entry.name)) files.push(full)
      }
    }
    walk(dist)

    for (const file of files) {
      expect(fs.readFileSync(file, 'utf8'), file).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
    }
  })

  test('P2-02 console is clean on the three routes and while the surfaces open and close', async ({
    page,
  }) => {
    const bucket = watch(page)

    for (const route of ['/', '/phones', PRODUCT_PATH]) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)

      // Open and close every surface on every route: the failures this phase can
      // introduce are as often in the teardown as in the entrance.
      await page.getByTestId('navbar-search').click()
      await page.waitForTimeout(400)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)

      await page.getByTestId('navbar-cart').click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    if (bucket.apiDown.length > 0) {
      console.log('[P2-02] API unavailable, reported separately:', JSON.stringify(bucket.apiDown.slice(0, 3)))
    }

    const notes = unexpected(bucket)
    expect(notes, notes.join('\n')).toEqual([])
  })

  test('P2-03 the navbar is solid at rest, shadowed when scrolled, and hides on the way down', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    const navbar = page.getByTestId('navbar')

    const atTop = await navbar.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        background: style.backgroundColor,
        borderBottom: style.borderBottomWidth,
        transform: style.transform,
        scrolled: node.dataset.scrolled,
      }
    })

    console.log('[P2-03] at top', JSON.stringify(atTop))
    expect(atTop.scrolled).toBe('false')
    // Near-opaque void with a blur: the search field sits over the hero and
    // has to read as a field, so the bar is never fully see-through.
    expect(atTop.background).toBe('rgba(10, 11, 13, 0.85)')

    await scrollTo(page, 200)
    await page.waitForTimeout(400)

    const scrolled = await navbar.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        background: style.backgroundColor,
        borderBottom: style.borderBottomWidth,
        backdrop: style.backdropFilter,
        scrolled: node.dataset.scrolled,
      }
    })

    console.log('[P2-03] scrolled', JSON.stringify(scrolled))
    expect(scrolled.scrolled).toBe('true')
    expect(Number.parseFloat(scrolled.borderBottom)).toBeGreaterThan(0)
    expect(scrolled.background).toBe('rgba(10, 11, 13, 0.85)')

    // Scroll down: the bar leaves via transform, not via display or top.
    await scrollTo(page, 1400)
    await page.waitForTimeout(600)

    const hidden = await navbar.evaluate((node) => {
      const style = getComputedStyle(node)
      const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? '' : style.transform)
      return { transform: style.transform, translateY: Math.round(matrix.f), hidden: node.dataset.hidden }
    })

    console.log('[P2-03] hidden', JSON.stringify(hidden))
    expect(hidden.hidden).toBe('true')
    expect(hidden.transform).not.toBe('none')
    // Moved off the top of the viewport by a real distance, not a 1px nudge.
    expect(Math.abs(hidden.translateY)).toBeGreaterThan(10)

    // Scroll up: it comes back.
    await scrollTo(page, 200)
    await page.waitForTimeout(600)

    const back = await navbar.evaluate((node) => {
      const style = getComputedStyle(node)
      const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? '' : style.transform)
      return { hidden: node.dataset.hidden, translateY: Math.round(matrix.f) }
    })

    console.log('[P2-03] back', JSON.stringify(back))
    expect(back.hidden).toBe('false')
    expect(Math.abs(back.translateY)).toBeLessThan(2)
  })

  test('P2-04 the active underline moves to the link for the current route', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // At the homepage no destination link is active, so there is no underline.
    expect(await page.getByTestId('navbar-underline').count()).toBe(0)

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Shop' }).click()
    await page.waitForURL('**/phones')
    await page.waitForTimeout(900)

    const onShop = await page.evaluate(() => {
      const link = document.querySelector('[data-testid="navbar-link"][data-active="true"]')
      const underline = document.querySelector('[data-testid="navbar-underline"]')
      if (!link || !underline) return null

      const linkBox = link.getBoundingClientRect()
      const underlineBox = underline.getBoundingClientRect()

      return {
        label: link.textContent.trim(),
        current: link.getAttribute('aria-current'),
        underlineInsideLink:
          underlineBox.left >= linkBox.left - 2 && underlineBox.right <= linkBox.right + 2,
        underlineCount: document.querySelectorAll('[data-testid="navbar-underline"]').length,
      }
    })

    console.log('[P2-04] on /phones', JSON.stringify(onShop))
    expect(onShop).not.toBeNull()
    expect(onShop.label).toBe('Shop')
    expect(onShop.current).toBe('page')
    // Exactly one underline, and it is inside the active link.
    expect(onShop.underlineCount).toBe(1)
    expect(onShop.underlineInsideLink).toBe(true)

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Categories' }).click()
    await page.waitForURL('**/categories')
    await page.waitForTimeout(900)

    const onCategories = await page.evaluate(() => {
      const link = document.querySelector('[data-testid="navbar-link"][data-active="true"]')
      return link ? link.textContent.trim() : null
    })

    console.log('[P2-04] on /categories', JSON.stringify(onCategories))
    expect(onCategories).toBe('Categories')
    expect(await page.getByTestId('navbar-underline').count()).toBe(1)
  })

  test('P2-05 the search overlay opens, focuses, suggests, and navigates on Enter', async ({ page }) => {
    const bucket = watch(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const trigger = page.getByTestId('navbar-search')
    await trigger.click()

    const overlay = page.getByTestId('search-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay).toHaveAttribute('role', 'dialog')
    await expect(overlay).toHaveAttribute('aria-modal', 'true')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const input = page.getByTestId('search-overlay-input')
    await expect(input).toBeFocused()
    console.log('[P2-05] focused:', await page.evaluate(() => document.activeElement?.dataset?.testid))

    await input.fill('iphone')
    await expect(page.getByTestId('search-suggestion').first()).toBeVisible({ timeout: 15_000 })
    const suggestionCount = await page.getByTestId('search-suggestion').count()
    console.log('[P2-05] suggestions', suggestionCount)
    expect(suggestionCount).toBeGreaterThan(0)

    // Escape closes and hands focus back to the trigger.
    await page.keyboard.press('Escape')
    await expect(overlay).toHaveCount(0)
    await expect(trigger).toBeFocused()

    // Reopen and submit with Enter.
    await trigger.click()
    const second = page.getByTestId('search-overlay-input')
    await expect(second).toBeFocused()
    await second.fill('iphone')
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/phones\?search=/, { timeout: 15_000 })

    console.log('[P2-05] url', page.url())
    expect(page.url()).toContain('/phones?search=iphone')

    expect(unexpected(bucket).join('\n')).toBe('')
  })

  test('P2-06 the cart badge increments and bounces when the count goes up', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    await expect(page.getByTestId('navbar-cart-badge')).toHaveCount(0)

    // The sampler has to be installed on the page the click happens on. The
    // badge bounces 300ms after the write lands, so anything observed afterwards
    // has already missed the peak — and `addToCart` navigates first, which would
    // throw away a sampler installed on the previous document.
    const labelBefore = await page.getByTestId('navbar-cart').getAttribute('aria-label')
    await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /add to cart/i }).first().waitFor()
    await page.waitForTimeout(600)
    await startBadgeSampler(page)

    await addToCart(page, { before: labelBefore, navigate: false })

    await expect(page.getByTestId('navbar-cart-badge')).toBeVisible()
    await expect(page.getByTestId('navbar-cart')).toHaveAttribute('aria-label', /1 item/)

    const scales = await readBadgeSampler(page)
    const peak = Math.max(...scales, 0)

    console.log('[P2-06] frames sampled:', scales.length, 'peak scale:', peak)
    console.log('[P2-06] distinct scales:', JSON.stringify([...new Set(scales.map((s) => Number(s.toFixed(3))))].slice(0, 12)))

    // The badge exists and is at rest...
    expect(scales.length).toBeGreaterThan(0)
    // ...and it actually grew. A render with no animation samples 1 forever.
    expect(peak, `badge never scaled past 1 (peak ${peak})`).toBeGreaterThan(1.08)
    // ...and came back to rest rather than being left scaled.
    expect(scales[scales.length - 1]).toBeCloseTo(1, 1)
  })

  test('P2-07 the cart drawer traps focus, closes on Escape, and returns focus', async ({ page }) => {
    const bucket = watch(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await addToCart(page)

    const cartButton = page.getByTestId('navbar-cart')
    await cartButton.click()

    const drawer = page.getByTestId('cart-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    await expect(cartButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('cart-backdrop')).toBeVisible()

    // Focus starts on the close button.
    await expect(page.getByTestId('cart-close')).toBeFocused()

    // Tab many times; focus must never leave the dialog.
    const escapes = []
    for (let i = 0; i < 18; i += 1) {
      await page.keyboard.press('Tab')
      escapes.push(
        await page.evaluate(() => {
          const drawerNode = document.querySelector('[data-testid="cart-drawer"]')
          return drawerNode?.contains(document.activeElement) ?? false
        }),
      )
    }

    console.log('[P2-07] focus stayed inside on', escapes.filter(Boolean).length, 'of', escapes.length, 'tabs')
    expect(escapes.every(Boolean)).toBe(true)

    // Shift+Tab wraps the other way too.
    const backwards = []
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Shift+Tab')
      backwards.push(
        await page.evaluate(() =>
          document.querySelector('[data-testid="cart-drawer"]')?.contains(document.activeElement) ?? false,
        ),
      )
    }
    expect(backwards.every(Boolean)).toBe(true)

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(cartButton).toBeFocused()

    // Backdrop click closes it too.
    await cartButton.click()
    await expect(page.getByTestId('cart-drawer')).toBeVisible()
    await page.getByTestId('cart-backdrop').click({ position: { x: 20, y: 300 } })
    await expect(page.getByTestId('cart-drawer')).toHaveCount(0)

    expect(unexpected(bucket).join('\n')).toBe('')
  })

  test('P2-08 the subtotal counts down, the free-delivery bar fills, and the empty state appears', async ({
    page,
  }) => {
    /*
     * Uses the ₱4,900 listing rather than the ₱32,990 one every other test adds.
     * The free-delivery bar only renders *below* the ₱15,000 threshold, so with
     * the expensive listing it never appeared and its absence would have read as
     * "never built" rather than "not applicable".
     */
    await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const before = await page.getByTestId('navbar-cart').getAttribute('aria-label')
    await page.goto(CHEAP_PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /add to cart/i }).first().click()
    await expect
      .poll(async () => await page.getByTestId('navbar-cart').getAttribute('aria-label'), {
        timeout: 20_000,
      })
      .not.toBe(before)
    await page.waitForTimeout(400)

    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })

    const subtotalBefore = await page.getByTestId('cart-subtotal').innerText()
    console.log('[P2-08] subtotal with one line', subtotalBefore)
    expect(subtotalBefore).toMatch(/4,?900/)

    // The bar is present because the cart is under ₱15,000, and it is partial.
    const bar = page.getByTestId('cart-free-delivery-bar')
    await expect(bar).toBeVisible()

    const fill = await bar.evaluate((node) => ({
      scaleX: new DOMMatrixReadOnly(getComputedStyle(node).transform).a,
      width: getComputedStyle(node).width,
    }))

    console.log('[P2-08] free-delivery bar', JSON.stringify(fill))
    // 4900 / 15000 = 0.3267
    expect(fill.scaleX).toBeGreaterThan(0.3)
    expect(fill.scaleX).toBeLessThan(0.36)
    // scaleX, not width: the element occupies the full track and is scaled.
    expect(fill.width).not.toBe('0px')

    // The progressbar carries the threshold for anyone who cannot see it.
    const progressbar = page.getByRole('progressbar', { name: /free delivery/i })
    await expect(progressbar).toHaveAttribute('aria-valuemax', '15000')
    console.log('[P2-08] aria-valuenow', await progressbar.getAttribute('aria-valuenow'))

    /*
     * Add a second line so the removal leaves a subtotal behind.
     *
     * Removing the *only* line unmounts the whole footer and replaces it with the
     * empty state, so there is no subtotal left to count down — the count can
     * only be observed when something remains. Two sub-threshold lines also keep
     * the free-delivery bar on screen throughout.
     */
    await addToCart(page, { path: SECOND_CHEAP_PRODUCT_PATH })
    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-line')).toHaveCount(2, { timeout: 15_000 })

    const twoLines = await page.getByTestId('cart-subtotal').innerText()
    console.log('[P2-08] subtotal with two lines', twoLines)
    expect(twoLines).toMatch(/11,?390/)

    // 11390 / 15000 = 0.7593, so the bar is fuller than it was with one line.
    const barTwoLines = await page
      .getByTestId('cart-free-delivery-bar')
      .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a)
    console.log('[P2-08] bar with two lines', barTwoLines)
    expect(barTwoLines).toBeGreaterThan(fill.scaleX)

    await startSubtotalSampler(page)

    // Remove the ₱6,490 line, leaving the ₱4,900 one.
    await page.getByTestId('cart-line').filter({ hasText: 'Redmi' }).getByTestId('cart-remove').click()
    await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })
    await page.waitForTimeout(900)

    const seen = await page.evaluate(() => window.__subtotals ?? [])
    const distinct = [...new Set(seen)]
    console.log(
      '[P2-08] subtotal frames',
      seen.length,
      'distinct',
      distinct.length,
      JSON.stringify(distinct.slice(0, 10)),
    )

    // It passed through intermediate figures rather than snapping 11,390 -> 4,900.
    expect(distinct.length).toBeGreaterThan(4)
    expect(distinct[0]).toMatch(/11,?390/)
    expect(distinct[distinct.length - 1]).toMatch(/4,?900/)
    // And it never showed a fractional peso, because the figure is money.
    expect(seen.every((text) => /^\₱[\d,]+$/.test(text))).toBe(true)

    // The bar fell back with the subtotal: 4900 / 15000 = 0.3267 again.
    const barAfter = await page
      .getByTestId('cart-free-delivery-bar')
      .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a)
    console.log('[P2-08] bar after removal', barAfter)
    expect(barAfter).toBeLessThan(barTwoLines)
    expect(barAfter).toBeCloseTo(0.3267, 3)

    // Now remove the last line and the empty state takes over.
    await page.getByTestId('cart-remove').first().click()
    await expect(page.getByTestId('cart-line')).toHaveCount(0, { timeout: 15_000 })

    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect(page.getByRole('link', { name: /browse phones/i })).toBeVisible()
    await expect(page.getByTestId('cart-free-delivery-bar')).toHaveCount(0)

    // The badge goes with it.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('navbar-cart-badge')).toHaveCount(0)

    // And the cart is genuinely empty on the server.
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    await expect(page.getByText(/nothing in your cart|your cart is empty/i).first()).toBeVisible()
  })

  test('P2-09 the checkout button navigates to checkout', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await addToCart(page)

    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })

    await page.getByTestId('cart-checkout').click()
    await page.waitForURL(/\/checkout$/, { timeout: 15_000 })

    console.log('[P2-09] url', page.url())
    expect(new URL(page.url()).pathname).toBe('/checkout')
    // The drawer is closed on the way out rather than left floating over the form.
    await expect(page.getByTestId('cart-drawer')).toHaveCount(0)
  })

  test('P2-09b no toast covers the drawer\'s own controls', async ({ page }) => {
    /*
     * The drawer opened on top of a "added to your cart" toast and, because the
     * toast was at `z-toast: 200` against the panel's `z-modal: 100`, the toast
     * rendered over the Checkout button — the one control the whole drawer
     * exists to offer. This asserts the stacking directly rather than waiting to
     * trip over it visually.
     */
    await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await addToCart(page)

    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })

    const checkout = page.getByTestId('cart-checkout')

    // Wait for the drawer to finish sliding in. Measured mid-slide, the button's
    // centre can still be past the right edge of the viewport, where
    // `elementsFromPoint` finds nothing and the check fails for no real reason.
    await expect
      .poll(() => checkout.evaluate((node) => node.getBoundingClientRect().right <= window.innerWidth), {
        timeout: 5_000,
      })
      .toBe(true)

    // The toast region is bottom-centre, exactly where the drawer's footer is.
    const overlap = await checkout.evaluate((node) => {
      const box = node.getBoundingClientRect()
      const centre = {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      }

      const covering = document.elementsFromPoint(centre.x, centre.y)

      return {
        toasts: document.querySelectorAll('[aria-label="Notifications"] [role="status"]').length,
        topmost: covering[0]?.dataset?.testid ?? covering[0]?.getAttribute('role') ?? covering[0]?.tagName,
        insideCheckout: node.contains(covering[0]),
      }
    })

    console.log('[P2-09b] toasts on screen:', overlap.toasts, 'topmost at Checkout:', overlap.topmost)

    // Whatever is topmost there must be the button itself, not a toast.
    expect(overlap.insideCheckout, `a ${overlap.topmost} is covering the Checkout button`).toBe(true)
  })

  test('P2-10 the mobile menu opens, locks scroll, staggers, and closes on navigation', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const bucket = watch(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    const menuButton = page.getByTestId('navbar-menu')
    await expect(menuButton).toBeVisible()
    await menuButton.click()

    const menu = page.getByTestId('mobile-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toHaveAttribute('role', 'dialog')
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    // Body scroll is locked.
    const locked = await page.evaluate(() => getComputedStyle(document.body).overflow)
    console.log('[P2-10] body overflow', locked)
    expect(locked).toBe('hidden')

    // Links stagger: their transforms differ partway through the reveal, and
    // they do not all share one frame.
    const opacities = await page.evaluate(async () => {
      const links = [...document.querySelectorAll('[data-testid="mobile-menu-link"]')]
      if (links.length < 2) return []

      const seen = []
      const started = performance.now()

      return await new Promise((resolve) => {
        const tick = () => {
          seen.push(links.map((node) => Number(getComputedStyle(node).opacity).toFixed(2)))

          if (performance.now() - started > 600) {
            resolve(seen)
            return
          }

          window.requestAnimationFrame(tick)
        }
        window.requestAnimationFrame(tick)
      })
    })

    const staggered = opacities.some((frame) => new Set(frame).size > 1)
    console.log('[P2-10] frames', opacities.length, 'staggered', staggered)
    expect(staggered).toBe(true)

    // Escape closes it.
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)

    const unlocked = await page.evaluate(() => getComputedStyle(document.body).overflow)
    expect(unlocked).not.toBe('hidden')

    // Reopen and navigate with a link.
    await menuButton.click()
    await page.getByTestId('mobile-menu-link').filter({ hasText: 'Shop' }).first().click()
    await page.waitForURL(/\/phones$/, { timeout: 15_000 })
    await expect(menu).toHaveCount(0)

    console.log('[P2-10] navigated to', new URL(page.url()).pathname)
    expect(unexpected(bucket).join('\n')).toBe('')

    await context.close()
  })

  test('P2-11 the footer links resolve and the newsletter validates', async ({ page }) => {
    const bucket = watch(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    // Every footer destination must be a real route, not a 404.
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="footer-link"]')].map((a) => a.getAttribute('href')),
    )

    console.log('[P2-11] footer links', hrefs.length, JSON.stringify(hrefs))
    expect(hrefs.length).toBeGreaterThan(10)

    for (const href of hrefs) {
      const response = await page.request.get(href)
      const status = response.status()
      console.log(`[P2-11]   ${href} -> ${status}`)

      // 200 or a client-side redirect target. A 404 is a broken footer link.
      if (status === 404) {
        // Dev server serves index.html for unknown paths, so a real 404 surfaces
        // as the not-found page instead. Assert on the rendered heading too.
        await page.goto(href, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)
        const heading = await page.locator('h1').first().innerText().catch(() => '')
        expect(heading, `${href} renders the not-found page`).not.toMatch(/not found|page you.*looking for/i)
      }
    }

    // The wordmark sits at the very bottom and reveals when it enters view, so it
    // is asserted *before* anything scrolls the page. The newsletter field is in
    // the same left column, and `scrollIntoViewIfNeeded` on it would trip the
    // reveal and make this check vacuous.
    const wordmark = page.getByTestId('footer-wordmark')
    const beforeScroll = await wordmark.evaluate((node) => ({
      opacity: Number(getComputedStyle(node).opacity),
      text: node.textContent.trim(),
    }))

    console.log('[P2-11] wordmark before scroll', JSON.stringify(beforeScroll))
    expect(beforeScroll.text).toBe('refon')
    expect(beforeScroll.opacity, 'wordmark already revealed at scrollY 0').toBeLessThan(0.5)

    // Newsletter: invalid then valid.
    const input = page.getByTestId('newsletter-input')
    await input.scrollIntoViewIfNeeded()

    await input.fill('not-an-email')
    await page.getByTestId('newsletter-submit').click()
    await expect(page.getByTestId('newsletter-error')).toBeVisible()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    console.log('[P2-11] error:', await page.getByTestId('newsletter-error').innerText())

    await input.fill('shopper@example.com')
    await expect(page.getByTestId('newsletter-error')).toHaveCount(0)
    await page.getByTestId('newsletter-submit').click()
    await expect(page.getByTestId('newsletter-success')).toBeVisible()
    console.log('[P2-11] success:', await page.getByTestId('newsletter-success').innerText())

    // And now that the footer really is in view, it has arrived.
    await scrollTo(page, 100000)
    await page.waitForTimeout(1200)

    const afterScroll = await wordmark.evaluate((node) => ({
      opacity: Number(getComputedStyle(node).opacity),
      text: node.textContent.trim(),
    }))
    console.log('[P2-11] wordmark after scroll', JSON.stringify(afterScroll))
    expect(afterScroll.text).toBe('refon')
    expect(afterScroll.opacity).toBeGreaterThan(0.9)

    expect(unexpected(bucket).join('\n')).toBe('')
  })

  test('P2-12 footer text meets WCAG AA contrast', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    await scrollTo(page, 100000)
    await page.waitForTimeout(600)

    const results = await page.evaluate(() => {
      const luminance = (rgb) => {
        const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number)
        const channel = (value) => {
          const scaled = value / 255
          return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      }

      const parse = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)

      /** Walks up for the first opaque background, the way a screen reader would. */
      const effectiveBackground = (node) => {
        let current = node
        while (current) {
          const style = getComputedStyle(current)
          const alpha = Number((style.backgroundColor.match(/[\d.]+\)$/)?.[0] ?? '1').replace(')', ''))
          if (alpha > 0.9 && style.backgroundColor !== 'transparent') {
            return parse(style.backgroundColor)
          }
          current = current.parentElement
        }
        return [11, 15, 14]
      }

      const findings = []
      const footer = document.querySelector('[data-testid="site-footer"]')
      if (!footer) return { error: 'no footer' }

      /** The node's own text, ignoring text belonging to descendant elements. */
      const ownText = (node) =>
        [...node.childNodes]
          .filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.textContent.trim())
          .join(' ')
          .trim()

      for (const node of footer.querySelectorAll('a, p, span, dt, dd, label, h2, button')) {
        // No `aria-hidden` exemption here on purpose. The giant wordmark is
        // decorative and `aria-hidden`, and WCAG's logotype exception would let it
        // off the hook — but it is 294px of visible text and a wordmark nobody can
        // read is a bug, so it is measured like everything else.
        const text = ownText(node)
        if (!text) continue

        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        // Not yet revealed (its entrance opacity), which is a transient state
        // rather than the resting contrast.
        if (Number(style.opacity) === 0) continue

        const rect = node.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) continue

        const foreground = parse(style.color)
        const background = effectiveBackground(node)

        const l1 = luminance(`rgb(${foreground.join(',')})`)
        const l2 = luminance(`rgb(${background.join(',')})`)
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

        const size = Number.parseFloat(style.fontSize)
        const weight = Number(style.fontWeight) || 400
        const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)
        const required = isLarge ? 3 : 4.5

        if (ratio < required) {
          findings.push({
            text: text.slice(0, 40),
            color: style.color,
            background: `rgb(${background.join(',')})`,
            ratio: Number(ratio.toFixed(2)),
            required,
            fontSize: size,
          })
        }
      }

      return { findings }
    })

    console.log('[P2-12] contrast', JSON.stringify(results, null, 2))
    expect(results.error).toBeUndefined()
    expect(results.findings, JSON.stringify(results.findings, null, 2)).toEqual([])
  })

  test('P2-13 reduced motion gives instant states and no transform animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    const bucket = watch(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await addToCart(page)

    // Sample every transform on the page across the drawer opening.
    const drawerSamples = await page.evaluate(async () => {
      const seen = []
      document.querySelector('[data-testid="navbar-cart"]')?.click()

      const started = performance.now()

      return await new Promise((resolve) => {
        const tick = () => {
          const drawer = document.querySelector('[data-testid="cart-drawer"]')
          if (drawer) {
            const style = getComputedStyle(drawer)
            seen.push(style.transform === 'none' ? 'none' : style.transform)
          }

          if (performance.now() - started > 1200) {
            resolve(seen)
            return
          }

          window.requestAnimationFrame(tick)
        }
        window.requestAnimationFrame(tick)
      })
    })

    const nonIdentity = drawerSamples.filter((value) => value !== 'none' && !/matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(value))
    console.log('[P2-13] drawer transforms', JSON.stringify([...new Set(drawerSamples)]))
    expect(nonIdentity, `drawer animated under reduced motion: ${JSON.stringify(nonIdentity)}`).toEqual([])

    await expect(page.getByTestId('cart-drawer')).toBeVisible()

    // The badge is present and not mid-animation.
    const badgeTransform = await page.getByTestId('navbar-cart-badge').evaluate((node) => {
      const style = getComputedStyle(node)
      return style.transform === 'none' ? 'none' : style.transform
    })
    console.log('[P2-13] badge transform', badgeTransform)
    expect(badgeTransform).toBe('none')

    await page.keyboard.press('Escape')

    // The search overlay opens instantly too.
    await page.getByTestId('navbar-search').click()
    await expect(page.getByTestId('search-overlay')).toBeVisible()
    const overlayOpacity = await page.getByTestId('search-overlay').evaluate((node) => Number(getComputedStyle(node).opacity))
    expect(overlayOpacity).toBe(1)
    await page.keyboard.press('Escape')

    const notes = unexpected(bucket)
    expect(notes, notes.join('\n')).toEqual([])

    // This context owns its own cookie, so the `afterEach` cleanup runs against a
    // different cart and cannot release this one's reservation.
    await clearCart(page)
    await context.close()
  })

  test('P2-14 axe-core finds no serious or critical violations', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    const navbar = await runAxe(page, '[data-testid="navbar"]')
    console.log('[P2-14] navbar', JSON.stringify(navbar))
    expect(navbar, JSON.stringify(navbar, null, 2)).toEqual([])

    await addToCart(page)

    await page.getByTestId('navbar-cart').click()
    await expect(page.getByTestId('cart-drawer')).toBeVisible()
    const drawer = await runAxe(page, '[data-testid="cart-drawer"]')
    console.log('[P2-14] drawer', JSON.stringify(drawer))
    expect(drawer, JSON.stringify(drawer, null, 2)).toEqual([])
    await page.keyboard.press('Escape')

    await page.getByTestId('navbar-search').click()
    await expect(page.getByTestId('search-overlay')).toBeVisible()
    const overlay = await runAxe(page, '[data-testid="search-overlay"]')
    console.log('[P2-14] search overlay', JSON.stringify(overlay))
    expect(overlay, JSON.stringify(overlay, null, 2)).toEqual([])
    await page.keyboard.press('Escape')

    await page.getByTestId('site-footer').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    const footer = await runAxe(page, '[data-testid="site-footer"]')
    console.log('[P2-14] footer', JSON.stringify(footer))
    expect(footer, JSON.stringify(footer, null, 2)).toEqual([])

    // See P2-13: the outer `afterEach` cannot see this context's cart.
    await clearCart(page)
    await context.close()
  })

  test('P2-15 captures the seven required views at both widths', async ({ page }) => {
    await fs.promises.mkdir(SHOTS, { recursive: true })

    const desktop = { width: 1440, height: 900 }
    const mobile = { width: 390, height: 844 }
    const problems = []
    const captured = []

    const capture = async (name) => {
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false })
      captured.push(name)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      if (overflow > 0) problems.push(`${name}: horizontal overflow ${overflow}px`)
    }

    /*
     * Asserts the wordmark is not clipped.
     *
     * With `leading-[0.78]` and `overflow-hidden` the bowls of the `e` and `o`
     * were cut off flat and the wordmark read as a slab of broken letterforms,
     * which no screenshot assertion would have caught.
     */
    const assertWordmarkIntact = async () => {
      const box = await page.evaluate(() => {
        const footer = document.querySelector('[data-testid="site-footer"]')
        const span = document.querySelector('[data-testid="footer-wordmark"] span')
        if (!footer || !span) return null

        const spanRect = span.getBoundingClientRect()
        const footerRect = footer.getBoundingClientRect()

        return {
          lineBox: Math.round(spanRect.height),
          fontSize: Math.round(Number.parseFloat(getComputedStyle(span).fontSize)),
          insideFooter: spanRect.top >= footerRect.top - 1 && spanRect.bottom <= footerRect.bottom + 1,
          fitsViewport: spanRect.width <= window.innerWidth + 1,
        }
      })

      expect(box, 'the footer wordmark was not found').not.toBeNull()
      // A line box shorter than one em cannot hold a full glyph.
      expect(box.lineBox).toBeGreaterThanOrEqual(box.fontSize)
      expect(box.insideFooter, 'the wordmark is cut by the footer').toBe(true)
      expect(box.fitsViewport, 'the wordmark overflows the viewport').toBe(true)

      return box
    }

    const wordmarkBoxes = {}

    for (const [label, viewport] of [
      ['1440', desktop],
      ['390', mobile],
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1400)

      // 1. navbar at top
      await capture(`navbar-top-${label}`)

      // 2. navbar after scroll.
      //
      // Down, then back up a little. Scrolling straight to a lower offset is a
      // scroll *down*, which correctly hides the bar — so the shot would capture
      // an empty strip and read as a broken header when it is the intended
      // behaviour. Any upward motion reveals it with the solid background on.
      await scrollTo(page, 600)
      await page.waitForTimeout(400)
      await scrollTo(page, 420)
      await page.waitForTimeout(700)
      await capture(`navbar-scrolled-${label}`)

      await scrollTo(page, 0)
      await page.waitForTimeout(700)

      // 3. search overlay
      await page.getByTestId('navbar-search').click()
      await expect(page.getByTestId('search-overlay')).toBeVisible()
      await page.getByTestId('search-overlay-input').fill('iphone')
      await page.waitForTimeout(1000)
      await capture(`search-overlay-${label}`)
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('search-overlay')).toHaveCount(0)

      // 4. mobile menu — a 390-only view, so it is captured once.
      if (label === '390') {
        await page.getByTestId('navbar-menu').click()
        await expect(page.getByTestId('mobile-menu')).toBeVisible()
        await page.waitForTimeout(900)
        await capture('mobile-menu-390')
        await page.keyboard.press('Escape')
        await expect(page.getByTestId('mobile-menu')).toHaveCount(0)
        await page.waitForTimeout(400)
      }

      // 5 + 6. cart drawer with a line, then empty.
      await addToCart(page)
      await page.getByTestId('navbar-cart').click()
      await expect(page.getByTestId('cart-line')).toHaveCount(1, { timeout: 15_000 })
      await page.waitForTimeout(800)
      await capture(`cart-drawer-${label}`)

      await page.getByTestId('cart-remove').first().click()
      await expect(page.getByTestId('cart-line')).toHaveCount(0, { timeout: 15_000 })
      await page.waitForTimeout(600)
      await capture(`cart-empty-${label}`)
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('cart-drawer')).toHaveCount(0)

      // 7. footer.
      //
      // Back to the homepage first: the cart work above leaves the page on a
      // product route, whose sticky mobile purchase bar is fixed to the viewport
      // and would sit on top of the footer in the shot.
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      await scrollTo(page, 100000)
      await page.waitForTimeout(1300)
      await capture(`footer-${label}`)
      wordmarkBoxes[label] = await assertWordmarkIntact()
    }

    console.log('[P2-15] wordmark boxes', JSON.stringify(wordmarkBoxes))
    console.log('[P2-15] captured', captured.length, 'shots:', captured.join(', '))
    console.log('[P2-15] problems', JSON.stringify(problems))

    expect(problems, problems.join('\n')).toEqual([])

    // Every listed view at both widths. A missing file would otherwise pass as
    // "nothing to look at".
    const expected = [
      'navbar-top-1440',
      'navbar-top-390',
      'navbar-scrolled-1440',
      'navbar-scrolled-390',
      'search-overlay-1440',
      'search-overlay-390',
      'cart-drawer-1440',
      'cart-drawer-390',
      'cart-empty-1440',
      'cart-empty-390',
      'footer-1440',
      'footer-390',
      'mobile-menu-390',
    ]

    expect(captured.sort()).toEqual(expected.sort())

    for (const name of expected) {
      const file = path.join(SHOTS, `${name}.png`)
      expect(fs.existsSync(file), `${name}.png was never written`).toBe(true)
      // A 0-byte or near-empty PNG means the capture silently failed.
      expect(fs.statSync(file).size, `${name}.png is suspiciously small`).toBeGreaterThan(5_000)
    }
  })
})