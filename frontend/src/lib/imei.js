/**
 * The same IMEI rules the API applies (backend/src/utils/imei.js), so a seller
 * sees a typo straight away instead of after submitting.
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
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** A friendly reason the IMEI is not accepted yet, or '' when it is fine. */
export function imeiProblem(value) {
  const digits = normalizeImei(value)
  if (!digits) return 'Enter the 15-digit IMEI. Dial *#06# on the phone to see it.'
  if (!/^\d+$/.test(digits)) return 'An IMEI has numbers only.'
  if (digits.length !== 15) return `An IMEI has 15 digits; this has ${digits.length}.`
  if (!isValidImei(digits)) return 'That IMEI is not valid. Check each digit against *#06#.'
  return ''
}

/**
 * What a buyer is told about a listing's IMEI. `imeiVerified` is only ever set
 * by a ReFon moderator at approval; an IMEI the seller typed is "on file" until
 * then.
 */
export function imeiStatus(listing) {
  const suffix = listing?.imeiLast4 ? ` ···${listing.imeiLast4}` : ''
  if (listing?.imeiVerified) {
    return {
      state: 'verified',
      label: `IMEI verified by ReFon${suffix}`,
      short: 'Verified by ReFon',
      detail: `A ReFon moderator matched the IMEI${suffix} with the phone and its box, checked it was not reported lost or stolen, and confirmed the iCloud / Google lock is off.`,
    }
  }
  if (listing?.imeiOnFile || listing?.imeiLast4) {
    return {
      state: 'on-file',
      label: `IMEI not verified yet${suffix}`,
      short: 'On file, not yet verified',
      detail: `The seller entered an IMEI ending${suffix || ' in four digits'} and it has a valid format, but ReFon has not checked it yet. Check it yourself before you pay.`,
    }
  }
  return {
    state: 'none',
    label: 'IMEI not verified',
    short: 'Not provided',
    detail: 'No IMEI was entered for this phone. Ask the seller for it and check it yourself before you pay.',
  }
}
