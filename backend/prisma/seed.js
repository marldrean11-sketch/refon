import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import {
  DEMO_BUYERS,
  DEMO_LISTINGS,
  DEMO_REVIEWS,
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
        city: sellerData.city,
        region: sellerData.region,
        tagline: sellerData.tagline,
        verificationStatus: 'APPROVED',
      },
      create: {
        id: sellerData.sellerId,
        userId: user.id,
        businessName: sellerData.businessName,
        contactInfo: sellerData.contactInfo,
        city: sellerData.city,
        region: sellerData.region,
        tagline: sellerData.tagline,
        verificationStatus: 'APPROVED',
        createdAt: sellerData.createdAt,
      },
    })
  }
}

async function seedListings() {
  for (const listing of DEMO_LISTINGS) {
    const catalogFields = {
      slug: listing.slug,
      originalPrice: listing.originalPrice,
      discountPercent: listing.discountPercent,
      conditionGrade: listing.conditionGrade,
      warrantyMonths: listing.warrantyMonths,
      ram: listing.ram,
      operatingSystem: listing.operatingSystem,
      networkType: listing.networkType,
      processor: listing.processor,
      displaySpec: listing.displaySpec,
      cameraSpec: listing.cameraSpec,
      categoryTags: listing.categoryTags,
      inspectionChecks: listing.inspectionChecks,
      imeiVerified: listing.imeiVerified,
      imeiLast4: listing.imeiLast4,
      quantity: listing.quantity,
      isFeatured: listing.isFeatured,
    }

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
        ...catalogFields,
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
        ...catalogFields,
      },
    })
  }
}

/**
 * Demo buyer accounts.
 *
 * Reviews need a reviewer, and reviews need buyers to exist. These accounts are
 * fixed so a presentation can sign in as a buyer without registering live, and
 * they carry the same production guard as the rest of the seed.
 */
async function seedDemoBuyers(passwordHash) {
  for (const buyer of DEMO_BUYERS) {
    await prisma.user.upsert({
      where: { email: buyer.email },
      update: {
        name: buyer.name,
        passwordHash,
        role: 'BUYER',
        emailVerifiedAt: new Date(),
      },
      create: {
        id: buyer.id,
        name: buyer.name,
        email: buyer.email,
        passwordHash,
        role: 'BUYER',
        emailVerifiedAt: new Date(),
        createdAt: buyer.createdAt,
      },
    })
  }
}

/**
 * Demo reviews.
 *
 * Aggregated into `sellers.rating_average` / `rating_count` afterwards, because
 * the catalog sorts and filters on those denormalised columns.
 */
async function seedDemoReviews() {
  for (const review of DEMO_REVIEWS) {
    await prisma.review.upsert({
      where: {
        listingId_userId: {
          listingId: review.listingId,
          userId: review.userId,
        },
      },
      update: {
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        conditionRating: review.conditionRating,
        sellerRating: review.sellerRating,
        verifiedPurchase: review.verifiedPurchase,
        status: 'PUBLISHED',
      },
      create: review,
    })
  }

  const sellers = await prisma.seller.findMany({ select: { id: true } })

  for (const seller of sellers) {
    const listingIds = await prisma.listing.findMany({
      where: { sellerId: seller.id },
      select: { id: true },
    })

    const reviews = await prisma.review.findMany({
      where: { listingId: { in: listingIds.map((entry) => entry.id) }, status: 'PUBLISHED' },
      select: { sellerRating: true },
    })

    const rated = reviews
      .map((entry) => entry.sellerRating)
      .filter((value) => typeof value === 'number')

    const average =
      rated.length > 0
        ? Number((rated.reduce((sum, value) => sum + value, 0) / rated.length).toFixed(2))
        : 0

    const completedSales = await prisma.listing.count({
      where: { sellerId: seller.id, status: 'SOLD' },
    })

    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        ratingAverage: average,
        ratingCount: rated.length,
        completedSales,
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
  await seedDemoBuyers(sellerPasswordHash)
  await seedDemoReviews()

  const [sellerCount, listingCount, reviewCount] = await Promise.all([
    prisma.seller.count(),
    prisma.listing.count(),
    prisma.review.count(),
  ])

  console.log('ReFon development seed completed.')
  console.table({
    adminEmail: admin.email,
    sellerCount,
    listingCount,
    reviewCount,
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
