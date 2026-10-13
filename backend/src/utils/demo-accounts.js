/**
 * The seeded accounts behind the one-click demo sign-in. Never the admin.
 * Anyone can use them at the booth, so their passwords cannot be changed.
 */
export const DEMO_ACCOUNTS = Object.freeze({
  BUYER: 'buyer@refon.test',
  SELLER: 'seller@refon.test',
})

const demoEmails = new Set(Object.values(DEMO_ACCOUNTS))

export function isDemoEmail(email) {
  return demoEmails.has(String(email ?? '').toLowerCase())
}
