import { prisma } from '../config/prisma.js'

/** The Philippines has one time zone and no daylight saving: UTC+8, all year. */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight in Manila today, as a UTC instant, so "today" means the booth's day. */
export function startOfManilaDay(now = new Date()) {
  const manila = now.getTime() + MANILA_OFFSET_MS
  return new Date(Math.floor(manila / DAY_MS) * DAY_MS - MANILA_OFFSET_MS)
}

export async function recordHealthCheckRun({ completed, passed }) {
  await prisma.healthCheckRun.create({ data: { completed, passed } })
  return getHealthCheckStats()
}

/**
 * Clears today's runs so the booth counter starts from zero after the team has
 * tested its own phones while setting up. Earlier days are left alone.
 */
export async function resetTodayHealthChecks() {
  await prisma.healthCheckRun.deleteMany({ where: { createdAt: { gte: startOfManilaDay() } } })
  return getHealthCheckStats()
}

export async function getHealthCheckStats() {
  const [today, total] = await Promise.all([
    prisma.healthCheckRun.count({ where: { createdAt: { gte: startOfManilaDay() } } }),
    prisma.healthCheckRun.count(),
  ])
  return { today, total }
}
