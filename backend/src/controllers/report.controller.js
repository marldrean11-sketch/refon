import {
  createListingReport,
  getReports,
  resolveReport,
} from '../services/report.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const submitReport = asyncHandler(async (req, res) => {
  const data = await createListingReport(
    req.user,
    req.validatedParams.id,
    req.validatedBody,
  )
  return res.status(201).json(data)
})

export const reports = asyncHandler(async (req, res) => {
  const data = await getReports({ status: req.validatedQuery?.status })
  return res.status(200).json(data)
})

export const resolve = asyncHandler(async (req, res) => {
  const data = await resolveReport(
    req.validatedParams.id,
    req.user.id,
    req.validatedBody,
  )
  return res.status(200).json(data)
})
