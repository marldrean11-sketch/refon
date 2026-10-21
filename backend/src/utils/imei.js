import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * IMEI helpers.
 *
 * ReFon never stores a full IMEI. A seller types the 15 digits once; the API
 * checks the Luhn check digit (catches typos and made-up numbers), keeps the last
 * four digits for display, and keeps a keyed fingerprint so the same phone
 * cannot sit on two live listings. The fingerprint is an HMAC rather than a
 * plain hash because IMEIs are short and structured: a plain SHA-256 of one could
 * be reversed by trying every number.
 *
 * What this does NOT prove: that the phone is not blacklisted. That needs the
 * networks or the GSMA database, and is done by a moderator before approval.
 */

/** Strips the spaces, dashes and slashes people type between digit groups. */
export function normalizeImei(value) {
  return String(value ?? '').replace(/[\s\-/.]/g, '')
}

/** True when `value` is 15 digits whose last digit is the correct Luhn check digit. */
export function isValidImei(value) {
  const digits = normalizeImei(value)
  if (!/^\d{15}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 15; i += 1) {
    let digit = Number(digits[14 - i])
    // Every second digit from the right is doubled; a two-digit result adds its digits.
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** Keyed fingerprint of a normalised IMEI, for duplicate detection only. */
export function fingerprintImei(value) {
  return crypto
    .createHmac('sha256', `refon-imei:${env.jwtSecret}`)
    .update(normalizeImei(value))
    .digest('hex')
}
