/**
 * Visual QA capture.
 *
 * Not part of the test suite: this is the tool used while designing to look at
 * every major screen at three widths side by side, because automated assertions
 * prove the interface still functions but say nothing about whether it reads as
 * a redesigned product.
 *
 *   node qa/capture.mjs                 # every route, every width
 *   node qa/capture.mjs home shop       # only the named routes
 *   node qa/capture.mjs home:1440       # one route at one width
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = 'http://localhost:5173'
const OUT = 'qa/shots'
const DESKTOP = { width: 1440, height: 1000 }
const WIDTHS = [
  { name: '1440', width: 1440, height: 1000 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
]

const SELLER = { email: 'seller@refon.test', password: 'SellerTest123!' }
const ADMIN = { email: 'admin@refon.test', password: 'AdminTest123!' }
const BUYER = { email: 'buyer@refon.test', password: 'BuyerTest123!' }

const ROUTES = [
  { name: 'home', url: '/' },
  { name: 'shop', url: '/phones' },
  { name: 'shop-filtered', url: '/phones?brand=Apple&conditionGrade=A' },
  { name: 'categories', url: '/categories' },
  { name: 'product', url: '/phones/apple-iphone-13-128-gb-midnight' },
  { name: 'how-it-works', url: '/how-it-works' },
  { name: 'quality-check', url: '/quality-check' },
  { name: 'faq', url: '/faq' },
  { name: 'warranty', url: '/warranty' },
  { name: 'about', url: '/about' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'notfound', url: '/definitely-not-a-page' },
  { name: 'cart', url: '/cart' },
  { name: 'checkout', url: '/checkout' },
  { name: 'seller', url: '/seller', as: SELLER },
  { name: 'seller-inquiries', url: '/seller/inquiries', as: SELLER },
  { name: 'seller-new-listing', url: '/seller/listings/new', as: SELLER },
  { name: 'saved', url: '/saved', as: BUYER },
  { name: 'my-inquiries', url: '/my-inquiries', as: BUYER },
  { name: 'account', url: '/account', as: BUYER },
  { name: 'admin', url: '/admin', as: ADMIN },
]

async function signIn(context, credentials) {
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill(credentials.email)
  await page.locator('#password').fill(credentials.password)
  await page.getByRole('button', { name: /sign in/i }).first().click()
  await page.waitForFunction(() => !location.pathname.includes('/login'), null, {
    timeout: 25_000,
  })
  await page.close()
}

const args = process.argv.slice(2)
const only = args.filter((arg) => !arg.includes(':'))
const widthFilter = args.filter((arg) => arg.includes(':')).map((arg) => Number(arg.split(':')[1]))

const routes = only.length > 0 ? ROUTES.filter((route) => only.includes(route.name)) : ROUTES
const widths = widthFilter.length > 0 ? WIDTHS.filter((entry) => widthFilter.includes(entry.width)) : WIDTHS

await fs.mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const contexts = new Map()

async function contextFor(credentials) {
  const key = credentials?.email ?? 'anon'
  if (!contexts.has(key)) {
    const context = await browser.newContext({
      viewport: DESKTOP,
      deviceScaleFactor: 1,
    })
    if (credentials) {
      await signIn(context, credentials)
    }
    contexts.set(key, context)
  }
  return contexts.get(key)
}

const problems = []

for (const route of routes) {
  for (const width of widths) {
    const context = await contextFor(route.as)
    const page = await context.newPage()
    await page.setViewportSize({ width: width.width, height: width.height })

    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

    await page.goto(`${BASE}${route.url}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1400)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    if (overflow > 0) {
      problems.push(`${route.name}@${width.name}: horizontal overflow ${overflow}px`)
    }
    for (const error of errors) {
      if (!/40[139]|422/.test(error)) {
        problems.push(`${route.name}@${width.name}: ${error}`)
      }
    }

    await page.screenshot({
      path: path.join(OUT, `${route.name}-${width.name}.png`),
      fullPage: false,
    })
    if (width.name === '1440') {
      await page.screenshot({
        path: path.join(OUT, `${route.name}-${width.name}-full.png`),
        fullPage: true,
      })
    }

    await page.close()
  }
  process.stdout.write(`captured ${route.name}\n`)
}

await browser.close()

console.log(`\n${problems.length === 0 ? 'no overflow or console problems' : 'PROBLEMS:'}`)
for (const problem of problems) {
  console.log(` - ${problem}`)
}