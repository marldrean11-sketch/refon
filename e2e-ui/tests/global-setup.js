import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { resetTestData, summarize } from './support-db.js'

const BASE = 'http://localhost:5173'
const stateDir = path.resolve('state')

/**
 * Prepares a clean run, then signs in / registers each account exactly once and
 * saves the cookie jars to disk.
 *
 * The reset runs first because the suite writes to a real database. Without it,
 * state from a previous run leaks forward: a seeded listing left as SOLD stops
 * accepting inquiries, and a stale seller application sorts ahead of the current
 * one in the admin moderation queue. Both produce failures that look like app
 * regressions but are test pollution.
 *
 * `resetTestData` refuses to run against production or a non-local database.
 */
export default async function globalSetup() {
  await fs.mkdir(stateDir, { recursive: true })

  const prisma = new PrismaClient()
  try {
    const result = await resetTestData(prisma)
    console.log(`[global-setup] reset test data: ${summarize(result)}`)
  } finally {
    await prisma.$disconnect()
  }

  const stamp = Date.now()

  const emails = {
    buyer: `e2e-ui-${stamp}-buyer@example.test`,
    buyer2: `e2e-ui-${stamp}-buyer2@example.test`,
    sellerApplicant: `e2e-ui-${stamp}-applicant@example.test`,
  }
  await fs.writeFile(path.join(stateDir, 'emails.json'), JSON.stringify(emails, null, 2))

  // PW_CHROMIUM_PATH lets a machine with a preinstalled Chromium skip the download.
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })

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
      await page.getByText('Magbebenta ako').click()
      await page.getByLabel('Store name').fill(`E2E ${role} Store`)
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
