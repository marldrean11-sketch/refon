import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

const MAX_REPORTS = 100

const reportableStatuses = ['APPROVED', 'SOLD']

const reportInclude = {
  reporter: { select: { id: true, name: true, email: true } },
  listing: {
    select: {
      id: true,
      brand: true,
      model: true,
      status: true,
      photos: true,
      price: true,
      seller: { select: { businessName: true } },
    },
  },
}

function presentReport(report) {
  return {
    id: report.id,
    listingId: report.listingId,
    reporterId: report.reporterId,
    reason: report.reason,
    details: report.details ?? null,
    status: report.status,
    resolutionNote: report.resolutionNote ?? null,
    resolvedById: report.resolvedById ?? null,
    resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter
      ? {
          id: report.reporter.id,
          name: report.reporter.name,
          email: report.reporter.email,
        }
      : null,
    listing: report.listing
      ? {
          id: report.listing.id,
          brand: report.listing.brand,
          model: report.listing.model,
          status: report.listing.status,
          mainPhoto: report.listing.photos[0] ?? null,
          price: Number(report.listing.price),
          sellerName: report.listing.seller.businessName,
        }
      : null,
  }
}

export async function createListingReport(userId, listingId, values) {
  if (userId.role === 'ADMIN') {
    throw new ApiError(
      403,
      'Moderators cannot report listings.',
      'CANNOT_REPORT_LISTING',
    )
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: { in: reportableStatuses } },
    select: { id: true, seller: { select: { userId: true } } },
  })

  if (!listing) {
    throw new ApiError(404, 'Listing not found.', 'LISTING_NOT_FOUND')
  }

  if (listing.seller.userId === userId.id) {
    throw new ApiError(
      403,
      'You cannot report your own listing.',
      'CANNOT_REPORT_OWN_LISTING',
    )
  }

  const existingReport = await prisma.report.findUnique({
    where: { listingId_reporterId: { listingId, reporterId: userId.id } },
    select: { id: true },
  })

  if (existingReport) {
    throw new ApiError(
      409,
      'You have already reported this listing.',
      'ALREADY_REPORTED',
    )
  }

  const details = values.details?.trim() ? values.details.trim() : null

  const report = await prisma.report.create({
    data: {
      listingId,
      reporterId: userId.id,
      reason: values.reason,
      details,
    },
  })

  // The reporter identity is deliberately withheld from this response.
  return {
    report: {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  }
}

export async function getReports({ status = 'OPEN' } = {}) {
  const where = status === 'ALL' ? {} : { status }
  const reports = await prisma.report.findMany({
    where,
    // Oldest open reports first so nothing sits unattended; resolved history is
    // still newest first because that is how moderators read the archive.
    orderBy: status === 'OPEN' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    take: MAX_REPORTS,
    include: reportInclude,
  })

  const listingIds = [...new Set(reports.map((report) => report.listingId))]
  const openCounts = new Map()

  if (listingIds.length > 0) {
    const grouped = await prisma.report.groupBy({
      by: ['listingId'],
      where: { listingId: { in: listingIds }, status: 'OPEN' },
      _count: { _all: true },
    })

    for (const row of grouped) {
      openCounts.set(row.listingId, row._count._all)
    }
  }

  return {
    reports: reports.map((report) => ({
      ...presentReport(report),
      openReportsForListing: openCounts.get(report.listingId) ?? 0,
    })),
  }
}

export async function resolveReport(reportId, adminUserId, { action, note }) {
  const resolutionNote = note?.trim() ? note.trim() : null

  return prisma.$transaction(async (transaction) => {
    const report = await transaction.report.findUnique({
      where: { id: reportId },
      include: {
        listing: {
          select: {
            id: true,
            brand: true,
            model: true,
            status: true,
            seller: { select: { userId: true } },
          },
        },
      },
    })

    if (!report) {
      throw new ApiError(404, 'Report not found.', 'REPORT_NOT_FOUND')
    }

    if (report.status !== 'OPEN') {
      throw new ApiError(
        409,
        'Only open reports can be resolved.',
        'REPORT_ALREADY_RESOLVED',
      )
    }

    const now = new Date()
    const listingLabel = `${report.listing.brand} ${report.listing.model}`

    if (action === 'TAKE_DOWN') {
      if (report.listing.status === 'SOLD') {
        throw new ApiError(
          409,
          'A sold listing cannot be taken down.',
          'LISTING_NOT_TAKEDOWN_ELIGIBLE',
        )
      }

      await transaction.listing.update({
        where: { id: report.listingId },
        data: { status: 'REJECTED', moderatorFeedback: resolutionNote },
      })

      // Every open report on this listing is closed by the same action, so the
      // listing is only pulled once no matter how many people reported it.
      const siblingReports = await transaction.report.findMany({
        where: { listingId: report.listingId, status: 'OPEN' },
        select: { id: true, reporterId: true },
      })

      await transaction.report.updateMany({
        where: { listingId: report.listingId, status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          resolutionNote,
          resolvedById: adminUserId,
          resolvedAt: now,
        },
      })

      await transaction.notification.create({
        data: {
          userId: report.listing.seller.userId,
          type: 'LISTING_TAKEN_DOWN',
          message: `Your ${listingLabel} listing was taken down after a buyer report. Reason: ${resolutionNote}`,
          relatedListingId: report.listingId,
        },
      })

      for (const reporterId of new Set(siblingReports.map((row) => row.reporterId))) {
        await transaction.notification.create({
          data: {
            userId: reporterId,
            type: 'REPORT_RESOLVED',
            message: 'Thanks for your report. We removed the listing.',
          },
        })
      }

      return { action, updatedCount: siblingReports.length }
    }

    const status = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED'
    const message =
      action === 'DISMISS'
        ? 'We reviewed your report and found no violation.'
        : 'Thanks for your report. We removed the listing.'

    await transaction.report.update({
      where: { id: report.id },
      data: {
        status,
        resolutionNote,
        resolvedById: adminUserId,
        resolvedAt: now,
      },
    })

    await transaction.notification.create({
      data: {
        userId: report.reporterId,
        type: 'REPORT_RESOLVED',
        message,
      },
    })

    return { action, updatedCount: 1 }
  })
}
