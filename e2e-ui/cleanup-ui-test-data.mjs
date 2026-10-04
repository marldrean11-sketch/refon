import { PrismaClient } from '@prisma/client'

/**
 * Removes every artefact the Playwright UI run created:
 *  - users whose email starts with e2e-ui-, plus their inquiries, favorites,
 *    reports and notifications (also any seller row they own)
 *  - reports filed against seeded listings
 *  - restores every listing the run mutated (status APPROVED, feedback cleared)
 */
const prisma = new PrismaClient()

const PREFIX = 'e2e-ui-'

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, email: true },
  })
  const userIds = users.map((user) => user.id)

  const inquiries = await prisma.inquiry.deleteMany({
    where: { buyerId: { in: userIds } },
  })
  const favorites = await prisma.favorite.deleteMany({
    where: { userId: { in: userIds } },
  })
  const reportsByUser = await prisma.report.deleteMany({
    where: { reporterId: { in: userIds } },
  })
  const notifications = await prisma.notification.deleteMany({
    where: { userId: { in: userIds } },
  })
  const sellerRows = await prisma.seller.deleteMany({
    where: { userId: { in: userIds } },
  })
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  })

  // Reports a test filed against listings that were not created by the run.
  const strayReports = await prisma.report.deleteMany({
    where: { reporterId: { notIn: userIds } },
  })

  // Restore listings the run mutated.
  const restored = await prisma.listing.updateMany({
    where: {
      OR: [{ status: { not: 'APPROVED' } }, { moderatorFeedback: { not: null } }],
    },
    data: { status: 'APPROVED', moderatorFeedback: null },
  })

  const counts = await prisma.$queryRawUnsafe(
    'SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM listings) AS listings, (SELECT count(*) FROM sellers) AS sellers, (SELECT count(*) FROM reports) AS reports, (SELECT count(*) FROM favorites) AS favorites',
  )

  console.log('users deleted:', deletedUsers.count)
  console.log('seller rows deleted:', sellerRows.count)
  console.log('inquiries deleted:', inquiries.count)
  console.log('favorites deleted:', favorites.count)
  console.log('reports deleted (by run users):', reportsByUser.count)
  console.log('reports deleted (stray):', strayReports.count)
  console.log('notifications deleted:', notifications.count)
  console.log('listings restored:', restored.count)
  console.log('final counts:', JSON.stringify(counts[0], (_k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}

main()
  .catch((error) => {
    console.error('cleanup failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
