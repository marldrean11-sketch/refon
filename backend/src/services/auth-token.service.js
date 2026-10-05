import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const lifetimeByType = {
  PASSWORD_RESET: ONE_HOUR_MS,
  EMAIL_VERIFY: ONE_DAY_MS,
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function hashMatches(candidateHash, storedHash) {
  const candidate = Buffer.from(candidateHash, 'utf8')
  const stored = Buffer.from(storedHash, 'utf8')

  if (candidate.length !== stored.length) {
    return false
  }

  return crypto.timingSafeEqual(candidate, stored)
}

/**
 * Issues a fresh token for the user and retires any previous unused token of the
 * same type, so an older emailed link can never be used after a new request.
 * Returns the raw token, which is only ever held in memory long enough to email it.
 */
export async function issueAuthToken(userId, type) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + lifetimeByType[type])

  await prisma.$transaction(async (transaction) => {
    await transaction.authToken.deleteMany({
      where: { userId, type, usedAt: null },
    })

    await transaction.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt,
      },
    })
  })

  return { token, expiresAt }
}

export async function consumeAuthToken(token, type) {
  const tokenHash = hashToken(token)
  const stored = await prisma.authToken.findFirst({
    where: { tokenHash, type },
  })

  if (
    !stored ||
    !hashMatches(tokenHash, stored.tokenHash) ||
    stored.usedAt ||
    stored.expiresAt.getTime() <= Date.now()
  ) {
    throw new ApiError(
      400,
      'This link is invalid or has expired. Please request a new one.',
      'INVALID_OR_EXPIRED_TOKEN',
    )
  }

  return stored
}
