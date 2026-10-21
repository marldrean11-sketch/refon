import { prisma } from '../config/prisma.js'

/**
 * Whether an account is suspended, cached for a short time.
 *
 * `authenticate` checks this on every signed-in request so a suspended
 * account loses access at once, not only when its session expires. The cache
 * keeps that to one small query per account per 30 seconds; suspending or
 * restoring an account through the admin endpoints updates it immediately.
 */
const TTL_MS = 30_000
const cache = new Map()

export async function isSuspended(userId) {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.suspended
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedAt: true },
  })
  const suspended = Boolean(user?.suspendedAt)
  cache.set(userId, { suspended, at: Date.now() })
  return suspended
}

export function rememberSuspension(userId, suspended) {
  cache.set(userId, { suspended, at: Date.now() })
}
