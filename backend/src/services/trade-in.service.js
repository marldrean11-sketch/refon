import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

/**
 * Trade-in requests: a visitor sends the estimate the trade-in page worked out,
 * with how to reach them, and the ReFon team follows up from the admin
 * dashboard. The estimate is the visitor's own (it is computed in the browser),
 * so it is stored as a guide, not as an offer.
 */

function present(request) {
  return {
    id: request.id,
    name: request.name,
    contact: request.contact,
    brand: request.brand,
    model: request.model,
    answers: request.answers,
    estimateLow: request.estimateLow,
    estimateHigh: request.estimateHigh,
    note: request.note ?? null,
    status: request.status,
    adminNote: request.adminNote ?? null,
    hasAccount: Boolean(request.userId),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  }
}

export async function createTradeIn(userId, values) {
  const request = await prisma.tradeInRequest.create({
    data: {
      userId: userId ?? null,
      name: values.name,
      contact: values.contact,
      brand: values.brand,
      model: values.model,
      answers: values.answers,
      estimateLow: values.estimateLow,
      estimateHigh: values.estimateHigh,
      note: values.note || null,
    },
  })
  return present(request)
}

export async function getTradeInsForAdmin({ status } = {}) {
  const [requests, newCount] = await Promise.all([
    prisma.tradeInRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.tradeInRequest.count({ where: { status: 'NEW' } }),
  ])
  return { requests: requests.map(present), newCount }
}

export async function updateTradeIn(id, { status, adminNote }) {
  const existing = await prisma.tradeInRequest.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new ApiError(404, 'Trade-in request not found.', 'TRADE_IN_NOT_FOUND')
  }
  const request = await prisma.tradeInRequest.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}),
    },
  })
  return present(request)
}
