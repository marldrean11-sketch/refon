import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const tokenOptions = {
  issuer: 'refon-api',
  audience: 'refon-frontend',
  algorithm: 'HS256',
}

export function createAccessToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    ...tokenOptions,
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, tokenOptions)
}
