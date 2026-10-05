import 'dotenv/config'

function parsePort(value) {
  const port = Number(value ?? 4000)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port between 1 and 65535.')
  }

  return port
}

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.')
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

const smtpHost = process.env.SMTP_HOST ?? ''

// Without a relay there is nowhere to send mail, so refuse to boot in production
// rather than silently dropping password reset and verification links.
if (nodeEnv === 'production' && !smtpHost) {
  throw new Error('SMTP_HOST must be set in production so ReFon can send account emails.')
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
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  mailFrom: process.env.MAIL_FROM ?? 'ReFon <no-reply@refon.test>',
  smtpHost,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
})
