import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = 'http://localhost:5173'
const stateDir = path.resolve('state')

/**
 * Signs in / registers each account exactly once per run and saves the cookie
 * jars to disk. Tests then reuse those jars, which keeps the whole suite inside
 * the backend authLimiter budget (10 login+register requests per 15 min per IP)
 * and makes the suite repeatable.
 */
export default async function globalSetup() {
  await fs.mkdir(stateDir, { recursive: true })
  const stamp = Date.now()

  const emails = {
    buyer: `e2e-ui-${stamp}-buyer@example.test`,
    buyer2: `e2e-ui-${stamp}-buyer2@example.test`,
    sellerApplicant: `e2e-ui-${stamp}-applicant@example.test`,
  }
  await fs.writeFile(path.join(stateDir, 'emails.json'), JSON.stringify(emails, null, 2))

  const browser = await chromium.launch()

  async function save(name, fn) {
    const context = await browser.newContext({ baseURL: BASE })
    const page = await context.newPage()
    await fn(page)
    await context.storageState({ path: path.join(stateDir, `${name}.json`) })
    await context.close()
    console.log(`[global-setup] saved state/${name}.json`)
  }

  async function register(page, email, role) {
    await page.goto('/register')
    await page.getByLabel('Full name').fill(`E2E ${role}`)
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Create a password').fill('BuyerTest123!')
    if (role === 'Seller') {
      await page.getByText("I'm a Seller").click()
    }
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.waitForFunction(() => !location.pathname.includes('/register'), null, {
      timeout: 25_000,
    })
  }

  async function login(page, email, password) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForFunction(() => !location.pathname.includes('/login'), null, {
      timeout: 25_000,
    })
  }

  await save('buyer', (page) => register(page, emails.buyer, 'Buyer'))
  await save('buyer2', (page) => register(page, emails.buyer2, 'Buyer'))
  await save('seller', (page) => login(page, 'seller@refon.test', 'SellerTest123!'))
  await save('admin', (page) => login(page, 'admin@refon.test', 'AdminTest123!'))
  await save('sellerApplicant', (page) => register(page, emails.sellerApplicant, 'Seller'))

  await browser.close()
}
