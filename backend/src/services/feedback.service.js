import { prisma } from '../config/prisma.js'

export async function createFeedback({ rating, wouldBuy, comment }) {
  await prisma.feedback.create({ data: { rating, wouldBuy, comment } })
}

/** The admin view: totals, the average, the yes/maybe/no split and the latest comments. */
export async function getFeedbackSummary() {
  const [aggregate, split, latest] = await Promise.all([
    prisma.feedback.aggregate({ _count: { _all: true }, _avg: { rating: true } }),
    prisma.feedback.groupBy({ by: ['wouldBuy'], _count: { _all: true } }),
    prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ])

  const counts = { YES: 0, MAYBE: 0, NO: 0 }
  for (const row of split) counts[row.wouldBuy] = row._count._all

  return {
    total: aggregate._count._all,
    averageRating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : null,
    wouldBuy: counts,
    latest: latest.map((entry) => ({
      id: entry.id,
      rating: entry.rating,
      wouldBuy: entry.wouldBuy,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
  }
}
