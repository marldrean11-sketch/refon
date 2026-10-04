import { test, expect } from '@playwright/test'
import {
  tryClickHeart,
  heartIsTopmost,
  savedBadge,
  watchErrors,
  expectNoFatalErrors,
} from './support.js'

export const LISTINGS = {
  // ReFon Select (seller@refon.test)
  iphone6s: '40000000-0000-4000-8000-000000000001',
  iphone13: '40000000-0000-4000-8000-000000000004',
  iphone12: '40000000-0000-4000-8000-000000000003',
  // Circuit Foundry (circuit@refon.test)
  iphone8: '40000000-0000-4000-8000-000000000002',
  galaxyS8: '40000000-0000-4000-8000-000000000005',
  galaxyS21: '40000000-0000-4000-8000-000000000006',
  xiaomi: '787a3c49-220c-4301-8c80-eeb0cd76b127',
}

export async function openListing(page, id) {
  await page.goto(`/listings/${id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}
