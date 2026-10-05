import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import {
  DEMO_LISTINGS,
  DEMO_SELLER_PASSWORD,
  DEMO_SELLERS,
} from './seed-data.js'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'admin@refon.test'
const ADMIN_PASSWORD = 'AdminTest123!'
const PASSWORD_HASH_ROUNDS = 12

function assertDevelopmentEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fixed development seed accounts cannot run in production.')
  }
}

async function seedAdmin(passwordHash) {
  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: 'ReFon Test Admin',
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
    create: {
      name: 'ReFon Test Admin',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })
}

async function seedSellers(passwordHash) {
  for (const sellerData of DEMO_SELLERS) {
    const user = await prisma.user.upsert({
      where: { email: sellerData.email },
      update: {
        name: sellerData.name,
        passwordHash,
        role: 'SELLER',
        emailVerifiedAt: new Date(),
      },
      create: {
        id: sellerData.userId,
        name: sellerData.name,
        email: sellerData.email,
        passwordHash,
        role: 'SELLER',
        emailVerifiedAt: new Date(),
        createdAt: sellerData.createdAt,
      },
    })

    await prisma.seller.upsert({
      where: { userId: user.id },
      update: {
        businessName: sellerData.businessName,
        contactInfo: sellerData.contactInfo,
        verificationStatus: 'APPROVED',
      },
      create: {
        id: sellerData.sellerId,
        userId: user.id,
        businessName: sellerData.businessName,
        contactInfo: sellerData.contactInfo,
        verificationStatus: 'APPROVED',
        createdAt: sellerData.createdAt,
      },
    })
  }
}

async function seedListings() {
  for (const listing of DEMO_LISTINGS) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      update: {
        sellerId: listing.sellerId,
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        price: listing.price,
        batteryPercent: listing.batteryPercent,
        storage: listing.storage,
        cosmeticCondition: listing.cosmeticCondition,
        color: listing.color,
        conditionNotes: listing.conditionNotes,
        photos: listing.photos,
        status: listing.status,
        moderatorFeedback: listing.moderatorFeedback,
      },
      create: {
        id: listing.id,
        sellerId: listing.sellerId,
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        price: listing.price,
        batteryPercent: listing.batteryPercent,
        storage: listing.storage,
        cosmeticCondition: listing.cosmeticCondition,
        color: listing.color,
        conditionNotes: listing.conditionNotes,
        photos: listing.photos,
        status: listing.status,
        moderatorFeedback: listing.moderatorFeedback,
        createdAt: listing.createdAt,
      },
    })
  }
}

async function seed() {
  assertDevelopmentEnvironment()

  const [adminPasswordHash, sellerPasswordHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, PASSWORD_HASH_ROUNDS),
    bcrypt.hash(DEMO_SELLER_PASSWORD, PASSWORD_HASH_ROUNDS),
  ])

  const admin = await seedAdmin(adminPasswordHash)
  await seedSellers(sellerPasswordHash)
  await seedListings()

  const [sellerCount, listingCount] = await Promise.all([
    prisma.seller.count(),
    prisma.listing.count(),
  ])

  console.log('ReFon development seed completed.')
  console.table({
    adminEmail: admin.email,
    sellerCount,
    listingCount,
  })
}

try {
  await seed()
} catch (error) {
  console.error('Seed failed:', error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
