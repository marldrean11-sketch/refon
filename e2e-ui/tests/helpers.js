import { test, expect } from '@playwright/test'

export const BUYER_PASSWORD = 'BuyerTest123!'
export const SELLER_PASSWORD = 'SellerTest123!'
export const ADMIN_PASSWORD = 'AdminTest123!'

export const runStamp = Date.now()

/** Collects console errors and uncaught page errors; call `assertClean()` at the end. */
export function watchErrors(page, bucket) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      bucket.push({ kind: 'console', text: message.text(), url: page.url() })
    }
  })
  page.on('pageerror', (error) => {
    bucket.push({ kind: 'pageerror', text: error.message, url: page.url() })
  })
}

export function assertClean(bucket, step) {
  if (bucket.length > 0) {
    const details = bucket
      .map((entry) => `${entry.kind} @ ${entry.url}: ${entry.text}`)
      .join('\n')
    throw new Error(`Browser errors detected at step "${step}":\n${details}`)
  }
}

export async function shot(page, name) {
  const path = `screenshots/${name}.png`
  await page.screenshot({ path, fullPage: false })
  return path
}

export async function registerBuyer(page, bucket, label) {
  const email = `e2e-ui-${runStamp}-${label}@example.test`

  await page.goto('/register')
  await page.getByLabel(/name/i).first().fill(`E2E UI ${label}`)
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(BUYER_PASSWORD)
  await page.getByRole('button', { name: /create account|sign up|register/i }).first().click()
  await page.waitForURL(/\/(browse|saved|my-inquiries)?$|\/browse/, { timeout: 20_000 })
  assertClean(bucket, `register-${label}`)

  return email
}

export async function loginAs(page, email, password) {
  await page.goto('/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(password)
  await page.getByRole('button', { name: /sign in/i }).first().click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })
}

export function heartOn(card) {
  return card.getByRole('button', { name: /^Save / })
}
