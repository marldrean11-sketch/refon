import { test, expect } from '@playwright/test'
import {
  tryClickHeart,
  heartIsTopmost,
  savedBadge,
  watchErrors,
  expectNoFatalErrors,
} from './support.js'

/**
 * Fixed ids of the seeded demo listings.
 *
 * These are stable because the seed upserts on a fixed id. Each entry names the
 * phone and the seller that owns it, so a mismatch between the id and the
 * expected model is obvious from the constant alone rather than from a failing
 * assertion. They must stay in sync with `backend/prisma/seed-data.js`.
 */
const seeded = (index) => `40000000-0000-4000-8000-${index}`

export const LISTINGS = {
  // ReFon Select (seller@refon.test)
  iphone6s: seeded('000000000001'), // Apple iPhone 6s
  iphone12: seeded('000000000003'), // Apple iPhone 12
  iphone13: seeded('000000000004'), // Apple iPhone 13
  iphone14: seeded('000000000028'), // Apple iPhone 14
  // Circuit Foundry (circuit@refon.test)
  iphone8: seeded('000000000002'), // Apple iPhone 8
  iphone11: seeded('000000000005'), // Apple iPhone 11
  galaxyS23: seeded('000000000007'), // Samsung Galaxy S23
  // Signal Phone Hub (signal@refon.test)
  galaxyS21: seeded('000000000009'), // Samsung Galaxy S21
  galaxyS8: seeded('000000000012'), // Samsung Galaxy S8
  // Metro Devices (metro@refon.test)
  galaxyA54: seeded('000000000010'), // Samsung Galaxy A54
  redmiNote9: seeded('000000000018'), // Xiaomi Redmi Note 9
  redmiNote12: seeded('000000000017'), // Xiaomi Redmi Note 12
}

export async function openListing(page, id) {
  await page.goto(`/listings/${id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}
