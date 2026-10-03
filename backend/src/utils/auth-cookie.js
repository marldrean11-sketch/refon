import { env } from '../config/env.js'

const durationMultipliers = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

export function durationToMilliseconds(value, fallback = 7 * 24 * 60 * 60 * 1000) {
  if (typeof value === 'number') {
    return value
  }

  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value ?? '')

  if (!match) {
    return fallback
  }

  return Number(match[1]) * durationMultipliers[match[2].toLowerCase()]
}

const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
}

export function setAuthCookie(res, token) {
  res.cookie(env.authCookieName, token, {
    ...baseCookieOptions,
    maxAge: durationToMilliseconds(env.jwtExpiresIn),
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(env.authCookieName, baseCookieOptions)
}
