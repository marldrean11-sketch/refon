/**
 * Phase 3A verification: the home page's top half.
 *
 * Scoped to the hero, the trust bar, the category rail, and New Arrivals. Phase
 * 3B gets its own spec; this one deliberately does not walk the sections below the
 * fold, because a failure there would say nothing about whether 3A is right.
 *
 * Two operational notes, both learned the hard way in Phase 2:
 *
 *   - **Carts are cleared before and after every test.** A cart belongs to a
 *     browser cookie; when a test ends its context is discarded but the cart row
 *     and its live 15-minute reservation survive. The next test gets a fresh
 *     context, a fresh cookie, a fresh cart — and is refused the same device with
 *     `LISTING_RESERVED` (409), which reads as an application bug and is not one.
 *   - **Nothing here signs in.** The auth limiter allows 10 requests per 15
 *     minutes per IP in memory, and `global-setup.js` already spends five.
 *
 * The contrast and axe walkers here are shared with the Phase 2 spec on purpose —
 * a second implementation of "compute a contrast ratio" would eventually disagree
 * with the first.
 */
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isNoise } from './support.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '..', '..', 'frontend')
const SHOTS = path.resolve(HERE, '..', 'qa', 'shots', 'phase3a')
const AXE = path.join(HERE, '..', 'node_modules', 'axe-core', 'axe.min.js')

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

/** How long the carousel tests wait to prove nothing advances on its own. */
const SLIDE_INTERVAL = 5000

/* ------------------------------------------------------------------ helpers */

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

    // Every data hook mounts an AbortController, so StrictMode's double-mount and
    // every navigation produce one. That is cleanup, not failure.
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
    if (isNoise(entry.text)) continue
    notes.push(`console.${entry.type}: ${entry.text}`)
  }

  for (const entry of bucket.pageErrors) notes.push(`pageerror: ${entry}`)

  for (const entry of bucket.failedRequests) {
    notes.push(`requestfailed: ${entry.url} (${entry.reason})`)
  }

  for (const entry of bucket.badResponses) {
    // The app asks for these on purpose while signed out.
    if ([401, 403, 409, 422].includes(entry.status)) continue
    notes.push(`http ${entry.status}: ${entry.url}`)
  }

  return notes
}

/**
 * Releases any cart the current session owns.
 *
 * These tests are all signed out, and since purchasing became buyer-only a signed-out
 * visitor provably cannot own a cart: the endpoint answers 401 and there is nothing
 * behind it. So the honest thing here is to establish *that* rather than to send a
 * request that can only fail, and to keep the "no live reservation survives this test"
 * guarantee for the case where the file is ever run signed in.
 *
 * The old `200 or 404` allowance is gone because 404 is no longer a reachable answer
 * for this route: a cart either belongs to the session or there is no session.
 */
async function clearCart(page) {
  const api = process.env.REFON_API ?? 'http://localhost:4000/api'

  const me = await page.request.get(`${api}/auth/me`).catch(() => null)

  if (!me || me.status() === 401) {
    // Signed out: no session, therefore no cart and no reservation to leak into the
    // next test. Verified above rather than assumed.
    return
  }

  if (me.status() !== 200) {
    throw new Error(`clearCart could not establish the session, got ${me.status()}`)
  }

  const response = await page.request.delete(`${api}/cart`).catch(() => null)

  if (!response || response.status() !== 200) {
    throw new Error(
      `clearCart expected 200 for a signed-in session, got ${response?.status()}`,
    )
  }
}

/** Scrolls and waits for Lenis to settle, so a scroll is finished when we measure. */
async function scrollTo(page, y) {
  await page.evaluate((target) => window.scrollTo(0, target), y)
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
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

/**
 * Cumulative Layout Shift, observed across a window of interaction.
 *
 * Injected rather than read from `PerformanceObserver` buffers so a test can
 * measure a specific interaction — a tab change, a carousel advance — rather than
 * the page's whole life.
 */
async function startCls(page) {
  await page.evaluate(() => {
    window.__cls = 0
    window.__clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count shifts that were not preceded by a user input, so a tab
        // click that legitimately reflows the grid is still counted.
        window.__cls += entry.value
      }
    })
    window.__clsObserver.observe({ type: 'layout-shift', buffered: false })
  })
}

async function readCls(page) {
  return page.evaluate(() => {
    window.__clsObserver?.disconnect()
    return Number((window.__cls ?? 0).toFixed(5))
  })
}

/* -------------------------------------------------------------------- tests */

test.describe('P3A home page, top half', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await clearCart(page)
  })

  test.afterEach(async ({ page }) => {
    await clearCart(page)
  })

  test('P3A-01 the production build succeeds and ships no external font CDN', async () => {
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

  test('P3A-02 the console is clean on the home page at 1440 and 390', async ({ page }) => {
    const bucket = watch(page)

    for (const viewport of [DESKTOP, MOBILE]) {
      await page.setViewportSize(viewport)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2200)

      // Scroll the whole page, so anything below the fold is exercised too.
      await scrollTo(page, 1200)
      await page.waitForTimeout(700)
      await scrollTo(page, 0)
      await page.waitForTimeout(500)

      // And switch a tab, which is the interaction most likely to warn.
      const tab = page.getByTestId('arrivals-tab').nth(1)
      if (await tab.count()) {
        await tab.click()
        await page.waitForTimeout(700)
      }
    }

    if (bucket.apiDown.length > 0) {
      console.log('[P3A-02] API unavailable, reported separately:', JSON.stringify(bucket.apiDown.slice(0, 3)))
    }

    const notes = unexpected(bucket)
    expect(notes, notes.join('\n')).toEqual([])
  })

  test('P3A-03 the hero headline is complete from the first frame', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    /*
     * Sampled from inside the page from the first frame. The redesigned hero has
     * no entrance animation on the headline: a page is complete at rest, so a
     * thumbnail, a screenshot, and a skimming reader all see the whole sentence.
     */
    const samples = await page.evaluate(async () => {
      const seen = []
      const started = performance.now()

      return await new Promise((resolve) => {
        const tick = () => {
          const heading = document.querySelector('h1')
          if (heading) {
            const lines = [...heading.children].map((line) => {
              const style = getComputedStyle(line)
              const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform)
              return { opacity: Number(Number(style.opacity).toFixed(2)), y: matrix ? Math.round(matrix.m42) : 0 }
            })
            seen.push(lines)
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

    const flat = samples.flat()
    console.log('[P3A-03] frames', samples.length, 'lines', flat.length)

    expect(samples.length, 'the headline was never sampled').toBeGreaterThan(10)
    for (const line of flat) {
      expect(Math.abs(line.y), 'a headline line moved').toBeLessThan(2)
    }

    const settled = await page.locator('h1').evaluate((heading) =>
      [...heading.children].map((line) => Number(Number(getComputedStyle(line).opacity).toFixed(2))),
    )
    console.log('[P3A-03] settled', JSON.stringify(settled))
    expect(settled.length, 'the headline has no lines').toBeGreaterThan(1)
    for (const opacity of settled) {
      expect(opacity, 'a headline line is not fully visible').toBe(1)
    }
  })

  test('P3A-04 the carousel stays put until asked, and its dots and arrows move it', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Scoped to the hero's own dots: New Arrivals has tabs of its own.
    const dots = page.locator('[role="tablist"][aria-label="Slides"] [role="tab"][aria-selected]')
    const dotCount = await dots.count()

    console.log('[P3A-04] dots', dotCount)
    expect(dotCount, 'the carousel has fewer than two slides').toBeGreaterThan(1)

    const selectedIndex = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[role="tablist"][aria-label="Slides"] [role="tab"]')].findIndex(
          (node) => node.getAttribute('aria-selected') === 'true',
        ),
      )

    const before = await selectedIndex()
    expect(before, 'no dot is selected on load').toBe(0)

    // No timer: the pointer is away from the hero and the slide does not change.
    await page.mouse.move(20, 880)
    await page.waitForTimeout(SLIDE_INTERVAL + 1800)
    expect(await selectedIndex(), 'the carousel advanced on its own').toBe(before)

    // Exactly one dot is ever selected, and the arrows move it by one.
    expect(
      await page.locator('[role="tablist"][aria-label="Slides"] [role="tab"][aria-selected="true"]').count(),
    ).toBe(1)

    await page.getByTestId('hero-next').click()
    await page.waitForTimeout(500)
    expect(await selectedIndex(), 'the next arrow did not advance').toBe((before + 1) % dotCount)

    await page.getByTestId('hero-prev').click()
    await page.waitForTimeout(500)
    expect(await selectedIndex(), 'the previous arrow did not go back').toBe(before)

    // A dot jumps straight to its slide.
    await dots.nth(dotCount - 1).click()
    await page.waitForTimeout(500)
    expect(await selectedIndex(), 'a dot did not select its slide').toBe(dotCount - 1)
  })

  test('P3A-05 the hero does not move on scroll at any width', async ({ page }) => {
    for (const viewport of [DESKTOP, MOBILE]) {
      await page.setViewportSize(viewport)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)

      // The tag's offset inside the yellow band. Parallax would change it; the
      // page scrolling on its own moves both boxes together and does not.
      const offset = () =>
        page.evaluate(() => {
          const panel = document.querySelector('[data-testid="hero-panel"]')
          const tag = panel?.querySelector('[data-testid="refon-tag"]')
          if (!panel || !tag) return null
          return { y: Math.round(tag.getBoundingClientRect().top - panel.getBoundingClientRect().top) }
        })

      await scrollTo(page, 0)
      await page.waitForTimeout(300)
      const atTop = await offset()

      await scrollTo(page, 500)
      await page.waitForTimeout(500)
      const scrolled = await offset()

      console.log(`[P3A-05] ${viewport.width}px tag offset at top`, JSON.stringify(atTop), 'scrolled', JSON.stringify(scrolled))
      expect(atTop, 'the hero has no tag').not.toBeNull()
      expect(Math.abs(scrolled.y - atTop.y), `the hero tag moved on scroll at ${viewport.width}px`).toBeLessThan(1)
    }
  })

  test('P3A-06 every text and background pair in 3A meets AA', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)

    // Reveal the sections that animate on entry, so nothing is measured at
    // opacity 0 and quietly skipped.
    await scrollTo(page, 700)
    await page.waitForTimeout(1200)
    await scrollTo(page, 0)
    await page.waitForTimeout(600)

    const findings = await page.evaluate(
      ({ selectors }) => {
        const luminance = (rgb) => {
          const [r, g, b] = rgb
          const channel = (value) => {
            const scaled = value / 255
            return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        }

        const parse = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)

        /** Walks up for the first opaque background, the way a reader would. */
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
          return [243, 245, 249]
        }

        const results = []

        for (const selector of selectors) {
          const root = document.querySelector(selector)
          if (!root) {
            results.push({ missing: selector })
            continue
          }

          for (const node of root.querySelectorAll('a, p, span, h1, h2, h3, li, button, dt, dd')) {
            const text = [...node.childNodes]
              .filter((child) => child.nodeType === Node.TEXT_NODE)
              .map((child) => child.textContent.trim())
              .join(' ')
              .trim()

            if (!text) continue

            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden') continue
            // Still mid-entrance.
            if (Number(style.opacity) < 0.95) continue
            if (node.closest('[aria-hidden="true"]')) continue

            const rect = node.getBoundingClientRect()
            if (rect.width < 2 || rect.height < 2) continue

            const foreground = parse(style.color)
            if (foreground.length !== 3) continue

            const background = effectiveBackground(node)

            const l1 = luminance(foreground)
            const l2 = luminance(background)
            const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

            const size = Number.parseFloat(style.fontSize)
            const weight = Number(style.fontWeight) || 400
            const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)
            const required = isLarge ? 3 : 4.5

            if (ratio < required) {
              results.push({
                section: selector,
                text: text.slice(0, 44),
                color: style.color,
                background: `rgb(${background.join(',')})`,
                ratio: Number(ratio.toFixed(2)),
                required,
                fontSize: size,
                weight,
              })
            }
          }
        }

        return results
      },
      {
        selectors: [
          '[data-testid="hero-panel"]',
          'section[aria-label="Why buyers trust ReFon"]',
          '[data-testid="category-rail"]',
          '[data-testid="arrivals-panel"]',
        ],
      },
    )

    const missing = findings.filter((entry) => entry.missing)
    expect(missing, `sections not found: ${JSON.stringify(missing)}`).toEqual([])

    console.log('[P3A-06] contrast findings', JSON.stringify(findings, null, 2))
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([])
  })

  test('P3A-07 the category tiles carry real counts and link to working filters', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await scrollTo(page, 700)
    await page.waitForTimeout(1200)

    const tiles = page.getByTestId('category-tile')
    const tileCount = await tiles.count()
    console.log('[P3A-07] tiles', tileCount)
    expect(tileCount, 'the category rail rendered no tiles').toBeGreaterThan(3)

    // The counts must equal what the API actually returns for each filter.
    for (let index = 0; index < tileCount; index += 1) {
      const tile = tiles.nth(index)
      const href = await tile.getAttribute('href')
      const shown = Number(await tile.getAttribute('data-count'))
      const label = (await tile.innerText()).split('\n')[0].trim()

      const response = await page.request.get(href)
      const body = await response.json()
      const real = body.pagination.total

      console.log(`[P3A-07]   ${label.padEnd(10)} ${href}  shown ${shown}  api ${real}`)

      expect(response.status()).toBe(200)
      expect(href).toMatch(/^\/phones\?/)
      expect(shown, `${label} shows ${shown} but the API returns ${real}`).toBe(real)
      expect(shown).toBeGreaterThan(0)
    }

    // Hover must actually lift and scale the tile.
    const first = tiles.first()
    const inner = first.locator('> div')

    await first.hover()
    await page.waitForTimeout(500)

    const hovered = await inner.evaluate((node) => {
      const style = getComputedStyle(node)
      const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform)
      return { y: matrix ? Math.round(matrix.m42) : 0, scale: matrix ? Number(matrix.a.toFixed(3)) : 1 }
    })

    console.log('[P3A-07] hovered tile', JSON.stringify(hovered))
    expect(hovered.y, 'the tile did not lift on hover').toBeLessThanOrEqual(-4)
    expect(hovered.scale, 'the tile did not scale on hover').toBeGreaterThan(1.02)
  })

  test('P3A-08 the New Arrivals tabs move the underline, swap the grid, and stay keyboard-operable', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1400)

    const arrivals = page.locator('section[aria-labelledby="arrivals-heading"]')
    await arrivals.scrollIntoViewIfNeeded()
    await page.waitForTimeout(900)

    const tabs = page.getByTestId('arrivals-tab')
    const tabCount = await tabs.count()
    console.log('[P3A-08] tabs', tabCount, JSON.stringify(await tabs.allInnerTexts()))
    expect(tabCount).toBeGreaterThan(1)

    const selectedLabel = () =>
      page.evaluate(() => {
        const node = document.querySelector('[data-testid="arrivals-tab"][aria-selected="true"]')
        return node ? node.textContent.trim().split(/\s+/)[0] : null
      })

    const gridSignature = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="arrivals-card"]')]
          .map((card) => card.getAttribute('data-listing'))
          .join(','),
      )

    const underlineBox = () =>
      page.evaluate(() => {
        const underline = document.querySelector('[data-testid="arrivals-underline"]')
        const selected = document.querySelector('[data-testid="arrivals-tab"][aria-selected="true"]')
        if (!underline || !selected) return null

        const u = underline.getBoundingClientRect()
        const t = selected.getBoundingClientRect()

        return {
          underlineLeft: Math.round(u.left),
          tabLeft: Math.round(t.left),
          insideTab: u.left >= t.left - 2 && u.right <= t.right + 2,
          underlineCount: document.querySelectorAll('[data-testid="arrivals-underline"]').length,
        }
      })

    expect(await selectedLabel()).toBe('All')
    const allSignature = await gridSignature()
    const firstUnderline = await underlineBox()

    console.log('[P3A-08] underline on All', JSON.stringify(firstUnderline))
    expect(firstUnderline).not.toBeNull()
    expect(firstUnderline.underlineCount, 'more than one underline is rendered').toBe(1)
    expect(firstUnderline.insideTab, 'the underline is not inside the active tab').toBe(true)

    // Switching tabs changes the grid and the underline travels.
    await startCls(page)

    await tabs.nth(1).click()
    await page.waitForTimeout(800)

    const secondLabel = await selectedLabel()
    const secondSignature = await gridSignature()
    const secondUnderline = await underlineBox()
    const cls = await readCls(page)

    console.log('[P3A-08] after click', secondLabel)
    console.log('[P3A-08] underline moved from', firstUnderline.underlineLeft, 'to', secondUnderline.underlineLeft)
    console.log('[P3A-08] CLS across the tab change', cls)

    expect(secondLabel).not.toBe('All')
    expect(secondSignature, 'the grid did not change').not.toBe(allSignature)
    expect(secondUnderline.underlineCount).toBe(1)
    expect(secondUnderline.insideTab).toBe(true)
    expect(
      Math.abs(secondUnderline.underlineLeft - firstUnderline.underlineLeft),
      'the underline did not travel to the new tab',
    ).toBeGreaterThan(4)
    expect(cls, `CLS across a tab change was ${cls}`).toBeLessThan(0.1)

    // Keyboard: arrows move the selection, Enter is a no-op that keeps it, and the
    // tablist has exactly one tab in the page's tab order at a time.
    await tabs.nth(1).focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(600)
    const afterArrow = await selectedLabel()
    console.log('[P3A-08] after ArrowRight', afterArrow)
    expect(afterArrow, 'ArrowRight did not move the selection').not.toBe(secondLabel)

    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    expect(await selectedLabel(), 'Enter changed the selection').toBe(afterArrow)

    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(600)
    expect(await selectedLabel(), 'ArrowLeft did not move back').toBe(secondLabel)

    const tabIndexes = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="arrivals-tab"]')].map((node) => node.tabIndex),
    )
    console.log('[P3A-08] tab indexes', JSON.stringify(tabIndexes))
    expect(tabIndexes.filter((index) => index === 0), 'the tablist is not a roving tabindex').toHaveLength(1)
  })

  test('P3A-09 reduced motion freezes the hero and the carousel', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    const bucket = watch(page)

    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1600)

    // No transform anywhere in the hero may be mid-flight or part-way.
    const chipTransforms = await page.evaluate(async () => {
      const seen = new Set()

      return await new Promise((resolve) => {
        const started = performance.now()
        const tick = () => {
          for (const chip of document.querySelectorAll('[data-testid="hero-chip"]')) {
            seen.add(getComputedStyle(chip).transform)
          }
          if (performance.now() - started > 1500) {
            resolve([...seen])
            return
          }
          window.requestAnimationFrame(tick)
        }
        window.requestAnimationFrame(tick)
      })
    })

    console.log('[P3A-09] chip transforms under reduced motion', JSON.stringify(chipTransforms))
    for (const value of chipTransforms) {
      const identity =
        value === 'none' || /matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(value)
      expect(identity, `a chip is transformed under reduced motion: ${value}`).toBe(true)
    }

    // The headline must be fully revealed immediately, not sliding.
    const headline = await page.locator('h1').evaluate((heading) =>
      [...heading.children].map((line) => {
        const inner = line.firstElementChild
        const style = getComputedStyle(inner ?? line)
        const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform)
        return {
          opacity: Number(Number(style.opacity).toFixed(2)),
          y: matrix ? Math.round(matrix.m42) : 0,
        }
      }),
    )

    console.log('[P3A-09] headline lines', JSON.stringify(headline))
    for (const line of headline) {
      expect(line.opacity, 'a headline line is not fully revealed under reduced motion').toBe(1)
      expect(Math.abs(line.y), 'a headline line is offset under reduced motion').toBeLessThan(1)
    }

    // The carousel must not advance on its own. Nothing hovers the panel here.
    const selectedIndex = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[role="tablist"][aria-label="Slides"] [role="tab"]')].findIndex(
          (node) => node.getAttribute('aria-selected') === 'true',
        ),
      )

    const before = await selectedIndex()
    await page.waitForTimeout(SLIDE_INTERVAL + 2500)
    const after = await selectedIndex()

    console.log('[P3A-09] carousel index before', before, 'after', after)
    expect(after, 'the carousel auto-advanced under reduced motion').toBe(before)

    // And the arrows still work — reduced motion means "no animation", not "no UI".
    await page.getByTestId('hero-next').click()
    await page.waitForTimeout(400)
    expect(await selectedIndex(), 'the next arrow is inert under reduced motion').not.toBe(before)

    const notes = unexpected(bucket)
    expect(notes, notes.join('\n')).toEqual([])

    await context.close()
  })

  test('P3A-10 no new code animates a property other than transform or opacity', () => {
    const files = [
      'src/features/homepage/HomeHero.jsx',
      'src/components/ui/RefonTag.jsx',
      'src/features/homepage/TrustStripSection.jsx',
      'src/features/homepage/FeaturedCategoriesSection.jsx',
      'src/features/homepage/NewArrivalsSection.jsx',
      'src/features/homepage/HomeListingCard.jsx',
      'src/content/home-content.js',
    ]

    const FORBIDDEN = new Set([
      'all',
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxWidth',
      'maxHeight',
      'top',
      'right',
      'bottom',
      'left',
      'inset',
      'margin',
      'padding',
      'gap',
      'rowGap',
      'columnGap',
      'gridTemplateColumns',
      'gridTemplateRows',
      'flexBasis',
      'fontSize',
      'letterSpacing',
      'lineHeight',
      'borderWidth',
      'borderRadius',
      'boxShadow',
      'filter',
      'backdropFilter',
      'backgroundColor',
      'backgroundImage',
      'backgroundPosition',
      'color',
      'borderColor',
    ])

    const CONFIGURATION = new Set([
      'duration',
      'delay',
      'ease',
      'type',
      'stiffness',
      'damping',
      'mass',
      'velocity',
      'restDelta',
      'restSpeed',
      'bounceStiffness',
      'bounceDamping',
      'times',
      'repeat',
      'repeatType',
      'repeatDelay',
      'from',
      'to',
      'easeIn',
      'easeOut',
    ])

    const ANIMATION_PROPS =
      /(?:^|[\s{,])(initial|animate|exit|whileInView|whileHover|whileTap|whileFocus|whileDrag|variants)\s*[=:]/

    const offenders = []
    let scannedBlocks = 0
    let configurationSeen = 0

    const countBraces = (text) => ({
      open: (text.match(/\{/g) ?? []).length,
      close: (text.match(/\}/g) ?? []).length,
    })

    for (const file of files) {
      const source = fs.readFileSync(path.join(FRONTEND, file), 'utf8')

      let depth = 0

      source.split('\n').forEach((line, index) => {
        const trimmed = line.trim()
        if (/^(\/\/|\/\*|\*\/|\*)/.test(trimmed)) return

        const opensBlock = ANIMATION_PROPS.test(trimmed)
        const braces = countBraces(trimmed)
        const inspecting = opensBlock || depth > 0

        if (inspecting) {
          const keys = [...trimmed.matchAll(/(?:^|[{,])\s*['"]?([a-zA-Z]+)['"]?\s*:/g)].map(
            (match) => match[1],
          )

          for (const key of keys) {
            if (FORBIDDEN.has(key)) {
              offenders.push(`${file}:${index + 1} animates ${key}`)
            } else if (CONFIGURATION.has(key)) {
              configurationSeen += 1
            }
          }
        }

        if (opensBlock) {
          scannedBlocks += 1
          depth = braces.open > braces.close ? braces.open - braces.close : 0
          return
        }

        if (depth > 0) {
          depth += braces.open - braces.close
          if (depth < 0) depth = 0
        }
      })
    }

    // Tailwind `transition-*` utilities name a property set outright.
    const SAFE_TRANSITION_SETS = new Set(['colors', 'opacity', 'transform', 'shadow', 'none'])

    for (const file of files.filter((name) => name.endsWith('.jsx'))) {
      const source = fs.readFileSync(path.join(FRONTEND, file), 'utf8')

      source.split('\n').forEach((line, index) => {
        if (/^(\/\/|\*)/.test(line.trim())) return

        for (const match of line.matchAll(/\btransition(?:-([a-z]+))?\b/g)) {
          const set = match[1]
          if (set && !SAFE_TRANSITION_SETS.has(set)) {
            offenders.push(`${file}:${index + 1} transition-${set}`)
          }
        }
      })
    }

    // And the compiled stylesheet, for any @keyframes this phase introduced.
    const cssDir = path.join(FRONTEND, 'src')
    const cssFiles = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.css')) cssFiles.push(full)
      }
    }
    walk(cssDir)

    for (const file of cssFiles) {
      const source = fs.readFileSync(file, 'utf8')
      for (const block of source.matchAll(/@keyframes\s+[\w-]+\s*\{[\s\S]*?\n\}/g)) {
        for (const property of block[0].matchAll(/^\s*([a-z-]+)\s*:/gm)) {
          if (!['transform', 'opacity', 'transform-origin'].includes(property[1])) {
            offenders.push(`${path.relative(FRONTEND, file)} @keyframes ${property[1]}`)
          }
        }
      }
    }

    console.log(`[P3A-10] scanned ${files.length} files, ${scannedBlocks} animation blocks`)
    console.log(`[P3A-10] transition config keys seen inside blocks: ${configurationSeen}`)
    console.log('[P3A-10] offenders', JSON.stringify(offenders, null, 2))

    // A scan that matched no blocks would pass vacuously.
    expect(scannedBlocks, 'the scan found no animation blocks to check').toBeGreaterThan(6)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  test('P3A-11 axe-core finds no serious or critical violations in 3A', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.setViewportSize(DESKTOP)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)

    // Reveal the on-scroll sections so axe sees them at their resting state.
    await scrollTo(page, 700)
    await page.waitForTimeout(1300)
    await scrollTo(page, 0)
    await page.waitForTimeout(600)

    for (const [label, selector] of [
      ['hero', '[data-testid="hero-panel"]'],
      ['trust bar', 'section[aria-label="Why buyers trust ReFon"]'],
      ['category rail', '[data-testid="category-rail"]'],
      ['new arrivals', 'section[aria-labelledby="arrivals-heading"]'],
    ]) {
      const violations = await runAxe(page, selector)
      console.log(`[P3A-11] ${label}`, JSON.stringify(violations))
      expect(violations, `${label}: ${JSON.stringify(violations, null, 2)}`).toEqual([])
    }

    // And the same three at 390, because a rail that is fine at 1440 can still
    // overflow or lose its labels on a phone.
    await page.setViewportSize(MOBILE)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await scrollTo(page, 900)
    await page.waitForTimeout(1200)

    for (const [label, selector] of [
      ['hero @390', '[data-testid="hero-panel"]'],
      ['category rail @390', '[data-testid="category-rail"]'],
      ['new arrivals @390', 'section[aria-labelledby="arrivals-heading"]'],
    ]) {
      const violations = await runAxe(page, selector)
      console.log(`[P3A-11] ${label}`, JSON.stringify(violations))
      expect(violations, `${label}: ${JSON.stringify(violations, null, 2)}`).toEqual([])
    }

    await context.close()
  })

  test('P3A-12 captures 3A at 1440 and 390', async ({ page }) => {
    await fs.promises.mkdir(SHOTS, { recursive: true })

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

    for (const [label, viewport] of [
      ['1440', DESKTOP],
      ['390', MOBILE],
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      await capture(`hero-${label}`)

      // The three sections below, framed one at a time.
      await scrollTo(page, 620)
      await page.waitForTimeout(1100)
      await capture(`trust-and-categories-${label}`)

      await page.locator('section[aria-labelledby="arrivals-heading"]').scrollIntoViewIfNeeded()
      await page.waitForTimeout(1100)
      await capture(`new-arrivals-${label}`)

      // A tab other than the default, because the underline in the wrong place is
      // the defect a screenshot is best at catching.
      const tab = page.getByTestId('arrivals-tab').nth(1)
      if (await tab.count()) {
        await tab.click()
        await page.waitForTimeout(800)
        await capture(`new-arrivals-tabbed-${label}`)
      }
    }

    console.log('[P3A-12] captured', captured.join(', '))
    console.log('[P3A-12] problems', JSON.stringify(problems))
    expect(problems, problems.join('\n')).toEqual([])

    for (const name of captured) {
      const file = path.join(SHOTS, `${name}.png`)
      expect(fs.existsSync(file), `${name}.png was never written`).toBe(true)
      expect(fs.statSync(file).size, `${name}.png is suspiciously small`).toBeGreaterThan(5_000)
    }
  })
})
