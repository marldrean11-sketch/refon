/**
 * Zoomed capture of a single element, for inspecting fine detail during design.
 *
 *   node qa/zoom.mjs <url-path> <selector> <out-name> [width] [height]
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'

const [route, selector, name, width = '1440', height = '1000'] = process.argv.slice(2)

await fs.mkdir('qa/shots', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 3,
})

await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const target = page.locator(selector).first()
await target.waitFor()
await target.screenshot({ path: `qa/shots/zoom-${name}.png` })

console.log(`qa/shots/zoom-${name}.png`)
await browser.close()