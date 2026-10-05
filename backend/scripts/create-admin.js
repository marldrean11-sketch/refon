import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'

/**
 * Creates the first real administrator, or promotes an existing account.
 *
 * Runs against whatever DATABASE_URL points at, so it works locally and inside the
 * container. Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from the environment so
 * the password never appears in shell history or in the process list.
 */

const PASSWORD_MIN_LENGTH = 12
const PASSWORD_HASH_ROUNDS = 12

function requireEnv(name) {
  const value = (process.env[name] ?? '').trim()

  if (value === '') {
    throw new Error(`${name} must be set.`)
  }

  return value
}

function readConfig() {
  const email = requireEnv('ADMIN_EMAIL').toLowerCase()
  const password = requireEnv('ADMIN_PASSWORD')
  const name = (process.env.ADMIN_NAME ?? '').trim() || 'ReFon Administrator'

  if (!email.includes('@')) {
    throw new Error('ADMIN_EMAIL must be a valid email address.')
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    )
  }

  if (name.length > 120) {
    throw new Error('ADMIN_NAME must be 120 characters or fewer.')
  }

  return { email, password, name }
}

async function upsertAdmin({ email, password, name }) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN',
        // An admin created from the console has already proven control of the mailbox
        // by deploying, so there is no reason to make them verify it.
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, role: true },
    })

    return { created, roleChanged: false }
  }

  const promoted = await prisma.user.update({
    where: { id: existing.id },
    data: {
      passwordHash,
      // Sessions issued before this change are refused on their next /api/auth/me.
      passwordChangedAt: new Date(),
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      role: 'ADMIN',
    },
    select: { id: true, email: true, role: true },
  })

  return { created: promoted, roleChanged: existing.role !== 'ADMIN' }
}

try {
  const config = readConfig()
  const { created, roleChanged } = await upsertAdmin(config)

  console.log(
    `${roleChanged ? 'Promoted' : 'Created'} administrator ${created.email} (${created.role}).`,
  )
  console.log('Any existing session for this account is now signed out. The password was not logged.')
} catch (error) {
  console.error(`Could not create the administrator: ${error.message}`)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}