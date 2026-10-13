import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { hashPassword, publicUserSelect, toPublicUser } from './auth.service.js'

export async function updateProfile(userId, { name, phone, defaultAddress }) {
  const data = {}
  if (name !== undefined) data.name = name.trim()
  if (phone !== undefined) data.phone = phone.replace(/[\s()-]/g, '') || null
  if (defaultAddress !== undefined) {
    // An address with nothing filled in is stored as no address.
    const filled =
      defaultAddress && Object.values(defaultAddress).some((value) => String(value ?? '').trim())
    data.defaultAddress = filled ? defaultAddress : Prisma.DbNull
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect,
  })

  return toPublicUser(user)
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...publicUserSelect, passwordHash: true },
  })

  if (!user) {
    throw new ApiError(401, 'Your session is no longer valid.', 'SESSION_INVALID')
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash)

  if (!currentMatches) {
    throw new ApiError(
      403,
      'Your current password is incorrect.',
      'CURRENT_PASSWORD_INCORRECT',
    )
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash)

  if (sameAsCurrent) {
    throw new ApiError(
      422,
      'Choose a password you have not used before.',
      'PASSWORD_UNCHANGED',
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  })

  // Sessions on other devices are dropped on their next /api/auth/me; this one is
  // kept alive by the refreshed cookie the controller issues.
  return toPublicUser(user)
}