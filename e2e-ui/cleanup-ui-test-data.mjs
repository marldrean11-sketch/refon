import { PrismaClient } from '@prisma/client'
import { resetTestData, summarize } from './tests/support-db.js'

/**
 * Removes every artefact the Playwright UI run created:
 *  - users whose email starts with e2e-ui-, plus their inquiries, favorites,
 *    reports, notifications, and auth tokens (also any seller row they own)
 *  - reports filed against seeded listings
 *  - restores every seeded listing the run mutated (status APPROVED, feedback
 *    cleared)
 *
 * Playwright already performs this reset in globalSetup, so running this by hand
 * is only needed when a run was interrupted and the suite must start clean.
 *
 * The reset refuses to run when NODE_ENV is production or when DATABASE_URL
 * points at a non-local host.
 */
const prisma = new PrismaClient()

resetTestData(prisma)
  .then((result) => {
    console.log(`cleanup complete: ${summarize(result)}`)
  })
  .catch((error) => {
    console.error('cleanup failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
