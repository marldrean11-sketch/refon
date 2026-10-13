/**
 * Screenshots of the live website for the README.
 *
 * Run by `.github/workflows/readme-screenshots.yml` (Actions → "README
 * screenshots" → Run workflow). Opens the hosted site, waits for the API to
 * wake up, and saves PNGs into docs/screenshots/. Reduced motion is on so
 * counters and animations show their final state.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SITE = process.env.SITE_URL ?? 'https://refon-lake.vercel.app'
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

async function wakeApi() {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(`${SITE}/api/health`)
      if (response.ok) return
    } catch {
      // Still asleep.
    }
    console.log(`API not ready (attempt ${attempt}), waiting…`)
    await new Promise((resolve) => setTimeout(resolve, 10_000))
  }
  throw new Error('The API did not wake up.')
}

async function shoot(browser, { name, path, viewport, fullPage = false, prepare }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport === MOBILE ? 2 : 1,
    reducedMotion: 'reduce',
    isMobile: viewport === MOBILE,
    hasTouch: viewport === MOBILE,
  })
  // Skip the one-time intro animation.
  await context.addInitScript(() => {
    try { window.sessionStorage.setItem('refon:preloader-seen', '1') } catch {}
  })
  const page = await context.newPage()
  await page.goto(`${SITE}${path}`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.waitForTimeout(3500)
  if (prepare) await prepare(page)
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage })
  console.log(`saved ${name}.png`)
  await context.close()
}

async function firstProductPath(browser) {
  const page = await browser.newPage()
  await page.goto(`${SITE}/phones`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.waitForTimeout(2000)
  const href = await page.locator('a[href^="/phones/"]').first().getAttribute('href')
  await page.close()
  return href ?? '/phones'
}

await mkdir(OUT, { recursive: true })
await wakeApi()
const browser = await chromium.launch()
try {
  const product = await firstProductPath(browser)
  const shots = [
    { name: 'home-desktop', path: '/', viewport: DESKTOP },
    { name: 'shop-desktop', path: '/phones', viewport: DESKTOP },
    { name: 'product-desktop', path: product, viewport: DESKTOP },
    { name: 'stores-desktop', path: '/stores', viewport: DESKTOP },
    { name: 'home-mobile', path: '/', viewport: MOBILE },
    { name: 'health-check-mobile', path: '/health-check', viewport: MOBILE },
    { name: 'trade-in-mobile', path: '/trade-in', viewport: MOBILE },
  ]
  for (const shot of shots) {
    try {
      await shoot(browser, shot)
    } catch (error) {
      console.error(`could not capture ${shot.name}:`, error.message)
    }
  }
} finally {
  await browser.close()
}
