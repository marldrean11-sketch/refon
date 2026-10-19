import { asyncHandler } from '../utils/async-handler.js'
import { getSiteSettings, updateSiteSettings } from '../services/site-settings.service.js'

export const show = asyncHandler(async (_req, res) => {
  // No caching: a booth number changed by the admin must show on the next load.
  res.set('Cache-Control', 'no-store')
  res.json({ settings: await getSiteSettings() })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ settings: await updateSiteSettings(req.validatedBody) })
})
