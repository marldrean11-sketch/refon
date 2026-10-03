import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

const PASSWORD_HASH_ROUNDS = 12
const DUMMY_PASSWORD_HASH = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW'

const publicSellerSelect = {
  id: true,
  verificationStatus: true,
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sellerVerificationStatus: user.seller?.verificationStatus ?? null,
    createdAt: user.createdAt,
  }
}

export async function registerUser({ name, email, password, role }) {
  const normalizedEmail = normalizeEmail(email)
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS)

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

  return toPublicUser(user)
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { seller: { select: publicSellerSelect } },
  })

  if (!user) {
    throw new ApiError(401, 'Your session is no longer valid.', 'SESSION_INVALID')
  }

  return toPublicUser(user)
}
