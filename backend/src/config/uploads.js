import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { ApiError } from '../utils/api-error.js'
import {
  detectImageType,
  generatePhotoFilename,
} from '../services/storage.service.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export const uploadsDirectory = path.resolve(currentDirectory, '../../uploads')

fs.mkdirSync(uploadsDirectory, { recursive: true })

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Files are held in memory so the bytes can be verified and then handed to whichever
// storage driver is configured, instead of being written straight to local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 6,
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('Only JPG, PNG, and WebP images are supported.'))
      return
    }

    callback(null, true)
  },
})

function invalidUpload(message) {
  return new ApiError(422, message, 'INVALID_PHOTO_UPLOAD')
}

export function uploadPhotoFiles(req, res, next) {
  upload.array('photos', 6)(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(
            413,
            'Each image must be 8 MB or smaller.',
            'PHOTO_TOO_LARGE',
          ),
        )
      }

      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          new ApiError(
            422,
            'Upload no more than 6 JPG, PNG, or WebP images.',
            'TOO_MANY_PHOTOS',
          ),
        )
      }

      return next(invalidUpload(error.message || 'The image upload could not be processed.'))
    }

    if (!req.files || req.files.length === 0) {
      return next(
        new ApiError(
          422,
          'Select at least one image to upload.',
          'PHOTO_REQUIRED',
        ),
      )
    }

    // A declared Content-Type proves nothing about the payload, so the real bytes are
    // checked here. One bad file rejects the whole request.
    for (const file of req.files) {
      const detected = detectImageType(file.buffer)

      if (detected !== file.mimetype) {
        return next(
          invalidUpload('Only JPG, PNG, and WebP images are supported.'),
        )
      }
    }

    for (const file of req.files) {
      file.filename = generatePhotoFilename(file.mimetype)
    }

    return next()
  })
}