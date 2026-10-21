import {
  cancelOrderAsBuyer,
  getBuyerOrder,
  getBuyerOrders,
  getOrdersForAdmin,
  getSellerOrders,
  updateOrderStatusAsSeller,
} from '../services/order.service.js'
import { createOrderReview } from '../services/review.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const myOrders = asyncHandler(async (req, res) => {
  return res.status(200).json(await getBuyerOrders(req.user.id))
})

export const myOrder = asyncHandler(async (req, res) => {
  const order = await getBuyerOrder(req.user.id, req.validatedParams.orderNumber)
  return res.status(200).json({ order })
})

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await cancelOrderAsBuyer(
    req.user.id,
    req.validatedParams.orderNumber,
    req.validatedBody?.reason,
  )
  return res.status(200).json({ order })
})

export const sellerOrders = asyncHandler(async (req, res) => {
  return res.status(200).json(await getSellerOrders(req.user.id, req.validatedQuery ?? {}))
})

export const updateSellerOrder = asyncHandler(async (req, res) => {
  const order = await updateOrderStatusAsSeller(
    req.user.id,
    req.validatedParams.id,
    req.validatedBody.status,
    req.validatedBody.reason,
  )
  return res.status(200).json({ order })
})

export const adminOrders = asyncHandler(async (req, res) => {
  return res.status(200).json(await getOrdersForAdmin(req.validatedQuery ?? {}))
})

export const reviewMyOrder = asyncHandler(async (req, res) => {
  const review = await createOrderReview(req.user.id, req.validatedParams.orderNumber, req.validatedBody)
  return res.status(201).json({ review })
})
