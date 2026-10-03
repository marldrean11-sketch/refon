import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getMyNotifications(req.user.id)
  return res.status(200).json(data)
})

export const markRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(
    req.validatedParams.id,
    req.user.id,
  )
  return res.status(200).json({ notification })
})

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await markAllNotificationsRead(req.user.id)
  return res.status(200).json(data)
})
