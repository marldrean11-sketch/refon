import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { uploadsDirectory } from '../config/uploads.js'
import { env } from '../config/env.js'

/**
 * Filenames produced by uploads are `<epochMillis>-<uuid>.<ext>`. Anything else under
 * /uploads is not ours to serve from object storage: the seed/ SVGs are served locally,
 * and a traversal or oddly named key must never reach the bucket.
 */
const MANAGED_FILENAME_PATTERN =
  /^[0-9]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export function isManagedFilename(filename) {
  return (
    typeof filename === 'string' &&
    filename.length > 0 &&
    !filename.includes('/') &&
    !filename.includes('\\') &&
    !filename.includes('..') &&
    MANAGED_FILENAME_PATTERN.test(filename)
  )
}

export function generatePhotoFilename(mimetype) {
  const extension = mimetype === 'image/jpeg' ? '.jpg' : `.${mimetype.split('/')[1]}`

  return `${Date.now()}-${crypto.randomUUID()}${extension}`
}

/**
 * Leading bytes that prove the payload really is the image type it claims to be.
 * multer only trusts the client-supplied Content-Type, so the bytes are checked here.
 */
const MAGIC_BYTES = [
  { mimetype: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mimetype: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
]

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  for (const { mimetype, bytes } of MAGIC_BYTES) {
    if (bytes.every((byte, index) => buffer[index] === byte)) {
      return mimetype
    }
  }

  // WebP is a RIFF container: "RIFF" ....size.... "WEBP" at offset 8.
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

const CONTENT_TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

export function contentTypeForFilename(filename) {
  return CONTENT_TYPE_BY_EXTENSION[path.extname(filename).toLowerCase()] ?? null
}

const localDriver = {
  name: 'local',

  async save({ buffer, filename }) {
    await fs.writeFile(path.join(uploadsDirectory, filename), buffer)

    return filename
  },

  async remove(filename) {
    try {
      await fs.unlink(path.join(uploadsDirectory, filename))
    } catch (error) {
      // Already gone is the outcome the caller wanted.
      if (error?.code !== 'ENOENT') {
        throw error
      }
    }
  },

  async list() {
    const entries = await fs.readdir(uploadsDirectory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      // Directories (seed/) and dotfiles such as .gitkeep are never listing uploads.
      if (!entry.isFile() || entry.name.startsWith('.')) {
        continue
      }

      const stats = await fs.stat(path.join(uploadsDirectory, entry.name))
      files.push({ filename: entry.name, lastModified: stats.mtime })
    }

    return files
  },

  async read(filename) {
    if (!isManagedFilename(filename)) {
      return null
    }

    try {
      const buffer = await fs.readFile(path.join(uploadsDirectory, filename))
      return {
        buffer,
        contentType: contentTypeForFilename(filename),
        contentLength: buffer.length,
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return null
      }

      throw error
    }
  },
}

function createS3Driver(config) {
  // Imported lazily so a local-only deployment never loads the AWS SDK.
  let clientPromise = null
  let sdkPromise = null

  async function loadSdk() {
    sdkPromise ??= import('@aws-sdk/client-s3')
    return sdkPromise
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const { S3Client } = await loadSdk()

        return new S3Client({
          region: config.region,
          ...(config.endpoint ? { endpoint: config.endpoint } : {}),
          forcePathStyle: config.forcePathStyle,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        })
      })()
    }

    return clientPromise
  }

  function keyFor(filename) {
    return `${config.prefix}${filename}`
  }

  return {
    name: 's3',

    async save({ buffer, filename }) {
      const [{ PutObjectCommand }, client] = await Promise.all([loadSdk(), getClient()])
      // No ACL is set, so the bucket default applies. Objects are expected to be private
      // and are only ever read back through this service.
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: keyFor(filename),
          Body: buffer,
          ContentType: contentTypeForFilename(filename),
        }),
      )

      return filename
    },

    async remove(filename) {
      const [{ DeleteObjectCommand }, client] = await Promise.all([loadSdk(), getClient()])
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: keyFor(filename) }),
      )
    },

    async list() {
      const [{ ListObjectsV2Command }, client] = await Promise.all([loadSdk(), getClient()])
      const objects = []

      let continuationToken
      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: config.prefix,
            ContinuationToken: continuationToken,
          }),
        )

        for (const object of response.Contents ?? []) {
          const filename = object.Key.slice(config.prefix.length)
          if (isManagedFilename(filename)) {
            objects.push({ filename, lastModified: object.LastModified ?? new Date(0) })
          }
        }

        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined
      } while (continuationToken)

      return objects
    },

    async read(filename) {
      if (!isManagedFilename(filename)) {
        return null
      }

      const [{ GetObjectCommand }, client] = await Promise.all([loadSdk(), getClient()])

      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: keyFor(filename) }),
        )

        return {
          stream: response.Body,
          contentType: response.ContentType ?? contentTypeForFilename(filename),
          contentLength: response.ContentLength ?? null,
        }
      } catch (error) {
        if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NoSuchKey') {
          return null
        }

        throw error
      }
    },
  }
}

export const storage = env.storageDriver === 's3' ? createS3Driver(env.s3) : localDriver

/**
 * Saves a batch, rolling back everything already written if any single save fails, so a
 * partial upload never leaves orphaned objects behind.
 */
export async function saveAll(files) {
  const saved = []

  try {
    for (const file of files) {
      await storage.save({ buffer: file.buffer, filename: file.filename })
      saved.push(file.filename)
    }
  } catch (error) {
    await Promise.all(saved.map((filename) => storage.remove(filename).catch(() => {})))
    throw error
  }

  return saved
}

export async function removeAll(filenames) {
  await Promise.all(
    filenames.map((filename) => storage.remove(filename).catch(() => {})),
  )
}