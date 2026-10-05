import { prisma } from '../src/config/prisma.js'
import { storage } from '../src/services/storage.service.js'

const MAX_AGE_MS = 24 * 60 * 60 * 1000
const isDryRun = process.argv.includes('--dry-run')

async function collectReferencedUrls() {
  const listings = await prisma.listing.findMany({ select: { photos: true } })
  const urls = new Set()

  for (const listing of listings) {
    for (const photo of listing.photos) {
      urls.add(photo)
    }
  }

  return urls
}

async function cleanupUploads() {
  // storage.list() only ever reports managed listing uploads, so the seed/ SVGs and the
  // .gitkeep placeholder can never be considered for deletion on either driver.
  const entries = await storage.list()
  const referencedUrls = await collectReferencedUrls()
  const cutoff = Date.now() - MAX_AGE_MS
  const removable = []

  for (const entry of entries) {
    if (referencedUrls.has(`/uploads/${entry.filename}`)) {
      continue
    }

    const lastModifiedMs = new Date(entry.lastModified).getTime()
    if (lastModifiedMs > cutoff) {
      continue
    }

    removable.push({
      filename: entry.filename,
      mtime: new Date(entry.lastModified),
    })
  }

  console.log(
    `Scanned ${entries.length} object(s) via the ${storage.name} storage driver (${isDryRun ? 'dry run' : 'live'}).`,
  )
  console.log(`Found ${removable.length} orphaned upload(s) older than 24 hours.`)

  if (isDryRun) {
    for (const file of removable) {
      console.log(`[dry-run] would delete ${file.filename} (${file.mtime.toISOString()})`)
    }
    return
  }

  for (const file of removable) {
    await storage.remove(file.filename)
    console.log(`Deleted ${file.filename} (${file.mtime.toISOString()})`)
  }
}

try {
  await cleanupUploads()
} catch (error) {
  console.error('Upload cleanup failed:', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
