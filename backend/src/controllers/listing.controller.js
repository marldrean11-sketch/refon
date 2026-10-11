import {
  createInquiry,
  createListing,
  deleteListing,
  getApprovedListing,
  getApprovedListingBySlug,
  getApprovedListings,
  getCatalogFacets,
  getCatalogSuggestions,
  getListingInquiries,
  getRelatedListings,
  getListingReviews,
  getSellerListings,
  lowerListingPrice,
  markListingSold,
  updateListing,
} from '../services/listing.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import {
  CATEGORY_SLUGS,
  LISTING_SORTS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  WARRANTY_OPTIONS,
} from '../utils/catalog-taxonomy.js'

export const create = asyncHandler(async (req, res) => {
  const listing = await createListing(req.user.id, req.validatedBody)
  return res.status(201).json({ listing })
})

export const getMine = asyncHandler(async (req, res) => {
  const listings = await getSellerListings(req.user.id)
  return res.status(200).json({ listings })
})

export const update = asyncHandler(async (req, res) => {
  const listing = await updateListing(
    req.validatedParams.id,
    req.user.id,
    req.validatedBody,
  )
  return res.status(200).json({ listing })
})

export const remove = asyncHandler(async (req, res) => {
  await deleteListing(req.validatedParams.id, req.user.id)
  return res.status(204).send()
})

export const getAll = asyncHandler(async (req, res) => {
  const data = await getApprovedListings(req.validatedQuery)
  return res.status(200).json({ ...data, filters: req.validatedQuery })
})

export const getOne = asyncHandler(async (req, res) => {
  const listing = await getApprovedListing(req.validatedParams.id)
  return res.status(200).json({ listing })
})

export const getOneBySlug = asyncHandler(async (req, res) => {
  const listing = await getApprovedListingBySlug(req.validatedParams.slug)
  return res.status(200).json({ listing })
})

export const getRelated = asyncHandler(async (req, res) => {
  const listings = await getRelatedListings(req.validatedParams.id)
  return res.status(200).json({ listings })
})

/**
 * Published reviews for a listing.
 *
 * Read-only by design — submitting a verified review requires an order and a
 * delivered state, which do not exist yet. Public, like the listing itself.
 */
export const getReviews = asyncHandler(async (req, res) => {
  const data = await getListingReviews(req.validatedParams.id)
  return res.status(200).json(data)
})

/**
 * Filter options for the shop sidebar.
 *
 * Returns the configured option lists alongside live facet counts, so the UI
 * renders one control set that is guaranteed to match what the API accepts.
 */
export const getFacets = asyncHandler(async (req, res) => {
  const facets = await getCatalogFacets()
  return res.status(200).json({
    facets,
    options: {
      sorts: LISTING_SORTS,
      storages: STORAGE_OPTIONS,
      rams: RAM_OPTIONS,
      warranties: WARRANTY_OPTIONS,
      categories: CATEGORY_SLUGS,
    },
  })
})

/**
 * Typeahead suggestions, built only from approved catalog rows so a suggestion
 * can never lead to an empty results page.
 */
export const getSuggestions = asyncHandler(async (req, res) => {
  const term = req.validatedQuery.q ?? ''
  const data = await getCatalogSuggestions(term)
  return res.status(200).json(data)
})

export const lowerPrice = asyncHandler(async (req, res) => {
  const result = await lowerListingPrice(
    req.validatedParams.id,
    req.user.id,
    req.validatedBody.price,
  )
  return res.status(200).json(result)
})

export const markSold = asyncHandler(async (req, res) => {
  const listing = await markListingSold(req.validatedParams.id, req.user.id)
  return res.status(200).json({ listing })
})

export const submitInquiry = asyncHandler(async (req, res) => {
  const inquiry = await createInquiry(
    req.validatedParams.id,
    req.validatedBody,
    req.user?.id ?? null,
  )
  return res.status(201).json({ inquiry })
})

export const getInquiries = asyncHandler(async (req, res) => {
  const inquiries = await getListingInquiries(
    req.validatedParams.id,
    req.user.id,
  )
  return res.status(200).json({ inquiries })
})
