import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

function presentSeller(seller) {
  return {
    id: seller.id,
    userId: seller.userId,
    businessName: seller.businessName,
    contactInfo: seller.contactInfo,
    verificationStatus: seller.verificationStatus,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
    appliedAt: seller.createdAt.toISOString(),
    user: seller.user
      ? {
          id: seller.user.id,
          name: seller.user.name,
          email: seller.user.email,
        }
      : undefined,
  }
}

export async function applyAsSeller(userId, values) {
  return prisma.$transaction(async (transaction) => {
    const existingSeller = await transaction.seller.findUnique({
      where: { userId },
    })

    const seller = existingSeller
      ? await transaction.seller.update({
          where: { id: existingSeller.id },
          data: {
            businessName: values.businessName,
            contactInfo: values.contactInfo,
            verificationStatus: 'PENDING',
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : await transaction.seller.create({
          data: {
            userId,
            businessName: values.businessName,
            contactInfo: values.contactInfo,
            verificationStatus: 'PENDING',
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        })

    await transaction.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    })

    return presentSeller(seller)
  })
}

export async function getSellerProfile(userId) {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!seller) {
    throw new ApiError(404, 'No seller profile exists for this account.', 'SELLER_NOT_FOUND')
  }

  return presentSeller(seller)
}

export async function getPendingSellers() {
  const sellers = await prisma.seller.findMany({
    where: { verificationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return sellers.map(presentSeller)
}

export async function reviewSeller(sellerId, decision) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new ApiError(422, 'Seller decision must be APPROVED or REJECTED.')
  }

  const existingSeller = await prisma.seller.findUnique({ where: { id: sellerId } })

  if (!existingSeller) {
    throw new ApiError(404, 'Seller profile not found.', 'SELLER_NOT_FOUND')
  }

  if (existingSeller.verificationStatus !== 'PENDING') {
    throw new ApiError(409, 'Only pending seller applications can be reviewed.')
  }

  const seller = await prisma.seller.update({
    where: { id: sellerId },
    data: { verificationStatus: decision },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return presentSeller(seller)
}
