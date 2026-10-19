import { prisma } from '../config/prisma.js'

/** The settings an admin can change. Anything else in the table is ignored. */
export const SITE_SETTING_KEYS = Object.freeze(['booth', 'viber'])

/**
 * `{ booth, viber }`, each a string or `null` when the admin has not set it,
 * in which case the website uses the value in its own code.
 */
export async function getSiteSettings() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...SITE_SETTING_KEYS] } } })
  const settings = Object.fromEntries(SITE_SETTING_KEYS.map((key) => [key, null]))
  for (const row of rows) settings[row.key] = row.value
  return settings
}

/** Saves the keys present in `changes`; `null` removes a setting. */
export async function updateSiteSettings(changes) {
  const writes = Object.entries(changes).map(([key, value]) =>
    value === null
      ? prisma.siteSetting.deleteMany({ where: { key } })
      : prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
  )
  await prisma.$transaction(writes)
  return getSiteSettings()
}
