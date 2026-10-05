import path from 'node:path'
import { asyncHandler } from '../utils/async-handler.js'
import { uploadsDirectory } from '../config/uploads.js'
import {
  contentTypeForFilename,
  isManagedFilename,
  storage,
} from '../services/storage.service.js'

const SEED_FILENAME_PATTERN = /^[0-9a-z][0-9a-z-]*\.svg$/
const SEED_SVG_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox"

/**
 * Seed illustrations ship inside the image and are never uploaded, so they are served
 * from the local uploads folder on every driver. The name pattern keeps this from being
 * usable to read arbitrary files out of the container.
 */
export const serveLocalSeedImage = asyncHandler(async (req, res) => {
  const { filename } = req.params

  if (!SEED_FILENAME_PATTERN.test(filename)) {
    return res.status(404).end()
  }

  res.set({
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    // An SVG served from our own origin must not be able to script the app.
    'Content-Security-Policy': SEED_SVG_CONTENT_SECURITY_POLICY,
  })

  return res.sendFile(path.join(uploadsDirectory, 'seed', filename))
})

/**
 * Serves a managed listing photo out of object storage. Only the exact filename shape
 * this service produces is accepted, so no traversal or arbitrary key can be read.
 */
export const serveStoredImage = asyncHandler(async (req, res) => {
  const { filename } = req.params

  if (!isManagedFilename(filename)) {
    return res.status(404).end()
  }

  const object = await storage.read(filename)

  if (!object) {
    return res.status(404).end()
  }

  res.set({
    'Content-Type': object.contentType ?? contentTypeForFilename(filename) ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })

  if (object.contentLength !== null && object.contentLength !== undefined) {
    res.set('Content-Length', String(object.contentLength))
  }

  if (object.buffer) {
    return res.status(200).send(object.buffer)
  }

  return object.stream.pipe(res)
})