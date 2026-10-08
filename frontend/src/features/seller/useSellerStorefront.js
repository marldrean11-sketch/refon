import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getSellerStorefrontListingsRequest,
  getSellerStorefrontRequest,
  getSellerStorefrontReviewsRequest,
} from './storefront-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

/**
 * Six phones per page, half the shop's twelve.
 *
 * A seller's whole catalogue is the unit here, not a filtered slice of a large
 * one, so paging it sooner keeps a storefront a browse rather than a scroll, and
 * six is the smallest page that still fills two rows on the four-column grid.
 * It also means a seller with a realistic handful of devices actually exercises
 * the pager instead of rendering every card on one screen.
 */
const LISTING_PAGE_SIZE = 6
const REVIEW_PAGE_SIZE = 5

/** Storefront sort options, matching the three the endpoint accepts. */
export const STOREFRONT_SORTS = Object.freeze([
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
])

const VALID_SORTS = new Set(STOREFRONT_SORTS.map((entry) => entry.value))

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Is this a seller id the API could resolve?
 *
 * Checked before the request so a hand-edited URL reports "not found" from the
 * page's own state instead of flashing a loading skeleton and then a 400. The
 * server still validates; this only decides which state to show.
 */
function isValidSellerId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * The seller profile.
 *
 * A 404 here is not an error state to recover from: an unapproved or unknown
 * seller has no storefront, so it is a terminal "not found". Anything else - a
 * network blip, a 500 - is transient and stays retryable.
 */
export function useSellerStorefront(sellerId) {
  const [seller, setSeller] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setSeller(null)

    if (!isValidSellerId(sellerId)) {
      setNotFound(true)
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    getSellerStorefrontRequest(sellerId, controller.signal)
      .then((response) => {
        if (isActive) {
          setSeller(response.seller)
        }
      })
      .catch((requestError) => {
        if (!isActive || requestError.name === 'AbortError') {
          return
        }

        // 404 and 400 both mean "this URL is not a storefront". Collapsing them
        // into one state is deliberate: the page must not tell a visitor whether
        // a given seller id belongs to a real but unapproved account.
        if ([400, 404].includes(requestError.status)) {
          setNotFound(true)
        } else {
          setError(requestError)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [sellerId, retryToken])

  useEffect(() => {
    const revalidate = () => setRetryToken((current) => current + 1)
    const unsubscribe = subscribeToMarketplaceChanges(revalidate)

    return () => unsubscribe()
  }, [])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return { seller, isLoading, error, notFound, retry }
}

/**
 * The inventory grid, with the page and sort in the URL.
 *
 * Filter state living in the query string means back/forward, refresh, and a
 * pasted link all produce the same result set with no synchronisation code, which
 * is the same contract `useCatalog` gives the shop.
 *
 * `pageSize` is sent per request rather than configured by the caller so the
 * page, the hook, and the URL cannot disagree about how many cards a "page" is.
 */
export function useSellerStorefrontListings(sellerId, { enabled = true } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  const page = useMemo(() => {
    const value = Number.parseInt(searchParams.get('page') ?? '1', 10)
    return Number.isInteger(value) && value > 0 ? value : 1
  }, [searchParams])

  // An unknown sort falls back rather than being forwarded: the endpoint rejects
  // it with a 422, and a storefront whose only control can produce an error page
  // is a broken control.
  const sort = useMemo(() => {
    const value = searchParams.get('sort')
    return VALID_SORTS.has(value) ? value : 'newest'
  }, [searchParams])

  // Skeletons only on a genuinely new query. A sort change or a page step within
  // an already-loaded inventory would otherwise blank the whole grid.
  const firstLoad = useRef(true)

  useEffect(() => {
    if (!enabled || !isValidSellerId(sellerId)) {
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    if (firstLoad.current) {
      setIsLoading(true)
    }
    // eslint-disable-next-line react/set-state-in-effect
    setError(null)

    getSellerStorefrontListingsRequest(
      sellerId,
      { page, sort, limit: LISTING_PAGE_SIZE },
      controller.signal,
    )
      .then((response) => {
        if (isActive) {
          setListings(response.listings)
          setPagination(response.pagination)
          firstLoad.current = false
        }
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== 'AbortError') {
          setError(requestError)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
    // `sellerId`, `page`, and `sort` are the whole query. They are listed
    // individually rather than joined into one key so the dependency is the real
    // set of inputs; a `retryToken` bump re-runs the request without changing
    // them.
  }, [sellerId, page, sort, enabled, retryToken])

  /** Writes a sort change and returns to page one. */
  const setSort = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams)
      next.set('sort', value)
      // Page 1 is not a preference to keep across a re-sort: page 4 of the old
      // ordering is an arbitrary page of the new one, and often an empty page.
      next.delete('page')
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const setPage = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams)
      params.set('page', String(next))
      setSearchParams(params)
    },
    [searchParams, setSearchParams],
  )

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return {
    listings,
    pagination,
    page,
    sort,
    isLoading,
    error,
    setSort,
    setPage,
    retry,
  }
}

/**
 * The trust history, accumulated across "load more" presses.
 *
 * Reviews are appended rather than replaced, because the point of the section is
 * the seller's history: a shopper asking "has anyone had trouble with this
 * seller?" wants the record, not a page of it. `reviews` is every review loaded
 * so far and `summary` is the seller's real total, so the header count and the
 * number of rows on screen can be different numbers without either being wrong.
 */
export function useSellerStorefrontReviews(sellerId, { enabled = true } = {}) {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  const hasMore = summary != null && reviews.length < summary.count

  useEffect(() => {
    if (!enabled || !isValidSellerId(sellerId)) {
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)

    getSellerStorefrontReviewsRequest(
      sellerId,
      { page: 1, limit: REVIEW_PAGE_SIZE },
      controller.signal,
    )
      .then((response) => {
        if (isActive) {
          setReviews(response.reviews)
          setSummary(response.summary)
          setPage(1)
        }
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== 'AbortError') {
          setError(requestError)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [sellerId, enabled, retryToken])

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !isValidSellerId(sellerId)) {
      return
    }

    const nextPage = page + 1

    setIsLoadingMore(true)
    getSellerStorefrontReviewsRequest(
      sellerId,
      { page: nextPage, limit: REVIEW_PAGE_SIZE },
    )
      .then((response) => {
        setReviews((current) => {
          // Ids are deduplicated rather than trusted: an overlapping page would
          // otherwise render the same review twice, which reads as a bug in the
          // record rather than in the pagination.
          const seen = new Set(current.map((review) => review.id))
          return [...current, ...response.reviews.filter((entry) => !seen.has(entry.id))]
        })
        setPage(nextPage)
      })
      .catch((requestError) => {
        setError(requestError)
      })
      .finally(() => {
        setIsLoadingMore(false)
      })
  }, [sellerId, page, hasMore, isLoadingMore])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return {
    reviews,
    summary,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    retry,
  }
}