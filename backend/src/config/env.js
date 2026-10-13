import 'dotenv/config'

function parsePort(value) {
  const port = Number(value ?? 4000)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port between 1 and 65535.')
  }

  return port
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === '') {
    return fallback
  }

  return value === 'true' || value === '1'
}

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.')
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

const smtpHost = process.env.SMTP_HOST ?? ''
const brevoApiKey = process.env.BREVO_API_KEY ?? ''

// Without a relay there is nowhere to send mail, so refuse to boot in production
// rather than silently dropping password reset and verification links.
if (nodeEnv === 'production' && !smtpHost && !brevoApiKey) {
  throw new Error(
    'SMTP_HOST or BREVO_API_KEY must be set in production so ReFon can send account emails.',
  )
}

const storageDriver = process.env.STORAGE_DRIVER ?? 'local'

if (!['local', 's3'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER must be either "local" or "s3".')
}

// How long a cart holds a physical listing before the hold lapses.
//
// Bounded to a sane window: an unbounded hold would let one buyer park a phone
// indefinitely, and an instant one would be useless during checkout.
const reservationMinutes = Number(process.env.RESERVATION_MINUTES ?? 15)

if (
  !Number.isFinite(reservationMinutes) ||
  reservationMinutes < 1 ||
  reservationMinutes > 1440
) {
  throw new Error('RESERVATION_MINUTES must be between 1 and 1440.')
}

const s3Bucket = process.env.S3_BUCKET ?? ''
const s3Region = process.env.S3_REGION ?? ''
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID ?? ''
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? ''

if (storageDriver === 's3') {
  const missing = [
    ['S3_BUCKET', s3Bucket],
    ['S3_REGION', s3Region],
    ['S3_ACCESS_KEY_ID', s3AccessKeyId],
    ['S3_SECRET_ACCESS_KEY', s3SecretAccessKey],
  ]
    .filter(([, value]) => value === '')
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(
      `STORAGE_DRIVER=s3 requires ${missing.join(', ')}. Point S3_ENDPOINT at your provider when using Cloudflare R2, Backblaze B2, or MinIO.`,
    )
  }
} else if (nodeEnv === 'production') {
  // Not fatal: a single container with a persistent volume is a legitimate setup.
  // It only matters when the API runs somewhere with an ephemeral filesystem.
  console.warn(
    '[storage] STORAGE_DRIVER=local in production: local uploads require a persistent volume, or uploaded photos are lost on redeploy. Use STORAGE_DRIVER=s3 for object storage.',
  )
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(process.env.PORT),
  clientUrls: (
    process.env.CLIENT_URL ??
    'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  authCookieName: 'refon_token',
  reservationMinutes,
  reservationMs: reservationMinutes * 60 * 1000,
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  mailFrom: process.env.MAIL_FROM ?? 'ReFon <no-reply@refon.test>',
  smtpHost,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  brevoApiKey,
  storageDriver,
  /**
   * Optional. The built frontend (`frontend/dist`) for a single-service deploy, in
   * which the API also serves the website so both share one origin and the
   * SameSite=Lax auth cookie works without a separate web server.
   */
  staticDir: process.env.STATIC_DIR ?? '',
  // How many proxies sit in front of the API. 1 for Render alone; 2 when Vercel
  // forwards /api to Render, so rate limits see the visitor and not Vercel.
  trustProxy: Math.max(0, Number.parseInt(process.env.TRUST_PROXY ?? '1', 10) || 0),
  s3: {
    bucket: s3Bucket,
    region: s3Region,
    // Optional: Cloudflare R2, Backblaze B2, and MinIO need their own endpoint.
    endpoint: process.env.S3_ENDPOINT ?? '',
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
    forcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE),
    prefix: (process.env.S3_PREFIX ?? 'uploads/').replace(/^\/+/, ''),
  },
})
