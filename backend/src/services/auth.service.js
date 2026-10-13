import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { consumeAuthToken, issueAuthToken } from './auth-token.service.js'
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from './mail.service.js'

const PASSWORD_HASH_ROUNDS = 12
const DUMMY_PASSWORD_HASH = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

const publicSellerSelect = {
  id: true,
  verificationStatus: true,
}

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerifiedAt: true,
  passwordChangedAt: true,
  phone: true,
  defaultAddress: true,
  suspendedAt: true,
  seller: { select: publicSellerSelect },
}

export function suspendedError() {
  return new ApiError(
    403,
    'This account is suspended. Contact ReFon if you think this is a mistake.',
    'ACCOUNT_SUSPENDED',
  )
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

/** Single place that turns a plaintext password into a stored hash. */
export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS)
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    sellerVerificationStatus: user.seller?.verificationStatus ?? null,
    phone: user.phone ?? null,
    defaultAddress: user.defaultAddress ?? null,
    createdAt: user.createdAt,
  }
}

export async function registerUser({ name, email, password, role }) {
  const normalizedEmail = normalizeEmail(email)
  const passwordHash = await hashPassword(password)

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role,
        },
      })

      if (role === 'SELLER') {
        await transaction.seller.create({
          data: {
            userId: createdUser.id,
            businessName: name,
            contactInfo: normalizedEmail,
            verificationStatus: 'PENDING',
          },
        })
      }

      return transaction.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        include: { seller: { select: publicSellerSelect } },
      })
    })

    // Registration must succeed even if the verification email cannot be sent,
    // and must not wait on the mail relay, which can be slow or unreachable.
    try {
      const { token } = await issueAuthToken(user.id, 'EMAIL_VERIFY')
      await sendEmailVerificationEmail(
        { to: user.email, name: user.name, token },
        { background: true },
      )
    } catch (error) {
      console.error('Could not send the verification email:', error.message)
    }

    return toPublicUser(user)
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ApiError(
        409,
        'An account with this email already exists.',
        'EMAIL_ALREADY_EXISTS',
      )
    }

    throw error
  }
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { seller: { select: publicSellerSelect } },
  })

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  )

  if (!user || !passwordMatches) {
    throw new ApiError(
      401,
      'The email or password is incorrect.',
      'INVALID_CREDENTIALS',
    )
  }

  // Checked only after the password, so a suspension is not revealed to someone
  // guessing an email address.
  if (user.suspendedAt) {
    throw suspendedError()
  }

  return toPublicUser(user)
}

export async function getUserById(id, issuedAt) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  })

  if (!user) {
    throw new ApiError(401, 'Your session is no longer valid.', 'SESSION_INVALID')
  }

  if (user.suspendedAt) {
    throw suspendedError()
  }

  // JWT iat is whole seconds, so compare in seconds to keep a cookie issued in
  // the same second as the password change valid.
  if (
    user.passwordChangedAt &&
    typeof issuedAt === 'number' &&
    issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    throw new ApiError(
      401,
      'Your session has expired. Please sign in again.',
      'SESSION_EXPIRED',
    )
  }

  return toPublicUser(user)
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, name: true, email: true },
  })

  // The caller always sees the same generic response so accounts cannot be probed.
  if (!user) {
    return
  }

  const { token } = await issueAuthToken(user.id, 'PASSWORD_RESET')
  await sendPasswordResetEmail({ to: user.email, name: user.name, token })
}

export async function resetPassword({ token, password }) {
  const storedToken = await consumeAuthToken(token, 'PASSWORD_RESET')
  const passwordHash = await hashPassword(password)

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    })

    await transaction.authToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    })

    // Retire any other outstanding reset links for this account.
    await transaction.authToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
    })
  })
}

export async function verifyEmail(token) {
  const storedToken = await consumeAuthToken(token, 'EMAIL_VERIFY')

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: storedToken.userId },
      data: { emailVerifiedAt: new Date() },
    })

    await transaction.authToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    })
  })

  return getUserById(storedToken.userId)
}

export async function resendVerificationEmail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  })

  if (!user) {
    throw new ApiError(401, 'Your session is no longer valid.', 'SESSION_INVALID')
  }

  if (user.emailVerifiedAt) {
    throw new ApiError(
      409,
      'Your email address is already verified.',
      'EMAIL_ALREADY_VERIFIED',
    )
  }

  const { token } = await issueAuthToken(user.id, 'EMAIL_VERIFY')
  await sendEmailVerificationEmail({ to: user.email, name: user.name, token })
}
