import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../src/config/prisma.js'
import { uploadsDirectory } from '../src/config/uploads.js'

const MAX_AGE_MS = 24 * 60 * 60 * 1000
const isDryRun = process.argv.includes('--dry-run')
const PROTECTED_ENTRIES = new Set(['.gitkeep', 'seed'])

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
  const entries = await fs.readdir(uploadsDirectory, { withFileTypes: true })
  const referencedUrls = await collectReferencedUrls()
  const cutoff = Date.now() - MAX_AGE_MS
  const removable = []

  for (const entry of entries) {
    // Directories (including seed/) and the .gitkeep placeholder are skipped.
    if (!entry.isFile() || PROTECTED_ENTRIES.has(entry.name)) {
      continue
    }

    const url = `/uploads/${entry.name}`
    if (referencedUrls.has(url)) {
      continue
    }

    const stats = await fs.stat(path.join(uploadsDirectory, entry.name))
    if (stats.mtimeMs > cutoff) {
      continue
    }

    removable.push({ filename: entry.name, mtime: stats.mtime })
  }

  console.log(
    `Scanned ${entries.length} entries in ${uploadsDirectory} (${isDryRun ? 'dry run' : 'live'}).`,
  )
  console.log(`Found ${removable.length} orphaned upload(s) older than 24 hours.`)

  if (isDryRun) {
    for (const file of removable) {
      console.log(`[dry-run] would delete ${file.filename} (${file.mtime.toISOString()})`)
    }
    return
  }

  for (const file of removable) {
    await fs.unlink(path.join(uploadsDirectory, file.filename))
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
