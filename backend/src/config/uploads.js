import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { ApiError } from '../utils/api-error.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export const uploadsDirectory = path.resolve(currentDirectory, '../../uploads')

fs.mkdirSync(uploadsDirectory, { recursive: true })

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDirectory)
  },
  filename: (_req, file, callback) => {
    const extension = extensionByMimeType[file.mimetype]
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
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

export async function removeUploadedFiles(files = []) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.promises.unlink(file.path)
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error
        }
      }
    }),
  )
}

export function uploadPhotoFiles(req, res, next) {
  upload.array('photos', 6)(req, res, async (error) => {
    if (error) {
      await removeUploadedFiles(req.files ?? []).catch(() => {})

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

      return next(
        new ApiError(
          422,
          error.message || 'The image upload could not be processed.',
          'INVALID_PHOTO_UPLOAD',
        ),
      )
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

    return next()
  })
}
