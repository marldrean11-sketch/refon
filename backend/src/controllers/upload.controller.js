import { asyncHandler } from '../utils/async-handler.js'

function presentUploadedFile(file) {
  const url = `/uploads/${file.filename}`

  return {
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url,
  }
}

export const uploadPhotos = asyncHandler(async (req, res) => {
  const files = (req.files ?? []).map(presentUploadedFile)

  return res.status(201).json({
    files,
    urls: files.map((file) => file.url),
  })
})
