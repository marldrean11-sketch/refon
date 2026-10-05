import { asyncHandler } from '../utils/async-handler.js'
import { saveAll } from '../services/storage.service.js'

function presentUploadedFile(file) {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    // The URL shape is part of the listing contract: the validator only accepts
    // /uploads/... and the stored rows keep it regardless of the storage driver.
    url: `/uploads/${file.filename}`,
  }
}

export const uploadPhotos = asyncHandler(async (req, res) => {
  // saveAll rolls the batch back if any single write fails, so a rejected upload never
  // leaves orphaned files on disk or in the bucket.
  await saveAll(req.files ?? [])

  const files = (req.files ?? []).map(presentUploadedFile)

  return res.status(201).json({
    files,
    urls: files.map((file) => file.url),
  })
})