import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Guest cart identity.
 *
 * A visitor who has not signed in still gets a cart, so something has to identify
 * them across requests. Two rules decide the shape of that something:
 *
 *  - The cookie carries an opaque random token and nothing else. Cart contents
 *    live in the database, so there is no commerce data in a value the browser can
 *    read or edit.
 *  - The database stores only the SHA-256 of that token. A leaked database dump
 *    therefore does not hand out live guest carts, exactly as `AuthToken` stores
 *    only the hash of a reset link.
 *
 * The token is never taken from a request body or query string, so a client
 * cannot nominate whose cart it wants to read.
 */

const GUEST_TOKEN_BYTES = 32

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
}

/** A fresh opaque guest token, as a lowercase hex string. */
export function createGuestCartToken() {
  return crypto.randomBytes(GUEST_TOKEN_BYTES).toString('hex')
}

/** Lowercase hex SHA-256, which is what the `guest_token_hash` column expects. */
export function hashGuestCartToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Reads the guest token from the request cookie.
 *
 * Returns null for anything that is not exactly 64 lowercase hex characters. A
 * malformed value is treated as absent rather than repaired, so a client cannot
 * smuggle an arbitrary string into the lookup.
 */
export function readGuestCartToken(req) {
  const raw = req.cookies?.[env.cartCookieName]

  if (typeof raw !== 'string' || !/^[0-9a-f]{64}$/.test(raw)) {
    return null
  }

  return raw
}

/** Issues the guest cookie. Called on the first cart write, not on every read. */
export function setGuestCartCookie(res, token) {
  res.cookie(env.cartCookieName, token, {
    ...cookieOptions,
    maxAge: env.cartCookieMaxAgeMs,
  })
}

/**
 * Clears the guest cookie after a merge, so the guest identity cannot be reused
 * to re-claim the same items against the account.
 */
export function clearGuestCartCookie(res) {
  res.clearCookie(env.cartCookieName, cookieOptions)
}