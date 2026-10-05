import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api-client.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'
import {
  applyPatch,
  clearFilters,
  parseFilters,
  removeFilter,
  serialiseFilters,
  toApiQuery,
  toggleArrayFilter,
} from './catalog-filters.js'

const DEFAULT_PAGE_SIZE = 12

/**
 * Catalog hook with the URL as the single source of truth for filter state.
 *
 * Filters are read from the query string on every render, so back/forward,
 * refresh, and a pasted URL all behave identically without any synchronisation
 * code. Writes go through `setSearchParams` with `replace: false` so each
 * filter change is a history entry the shopper can step back through.
 */
export function useCatalog({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ listings: [], pagination: null, brands: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncVersion, setSyncVersion] = useState(0)
  const [retryToken, setRetryToken] = useState(0)

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const queryKey = useMemo(
    () => JSON.stringify({ ...toApiQuery(filters), page: filters.page, pageSize }),
    [filters, pageSize],
  )

  const firstLoad = useRef(true)

  useEffect(() => {
    return subscribeToMarketplaceChanges(() => {
      setSyncVersion((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    // Only show skeletons on a genuinely new query, not on a sort toggle inside
    // an already-loaded result set, which would flash the whole grid.
    if (firstLoad.current) {
      setIsLoading(true)
    }
    setError(null)

    const query = new URLSearchParams(toApiQuery(filters))
    query.set('page', String(filters.page))
    query.set('pageSize', String(pageSize))

    const timer = window.setTimeout(async () => {
      try {
        const response = await apiRequest(`/listings?${query.toString()}`, {
          signal: controller.signal,
        })

        if (isActive) {
          setState({
            listings: response.listings,
            pagination: response.pagination,
            brands: response.brands,
          })
          firstLoad.current = false
        }
      } catch (requestError) {
        if (isActive && requestError.name !== 'AbortError') {
          setError(requestError)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }, 200)

    return () => {
      isActive = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [queryKey, syncVersion, retryToken])

  /** Writes a filter patch into the URL. */
  const setFilters = useCallback(
    (patch, { replace = false } = {}) => {
      const next = applyPatch(filters, patch)
      setSearchParams(serialiseFilters(next), { replace })
    },
    [filters, setSearchParams],
  )

  const setPage = useCallback(
    (page) => {
      const next = { ...filters, page }
      setSearchParams(serialiseFilters(next))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [filters, setSearchParams],
  )

  const toggleFilter = useCallback(
    (key, value) => {
      setSearchParams(serialiseFilters(toggleArrayFilter(filters, key, value)))
    },
    [filters, setSearchParams],
  )

  const clearOne = useCallback(
    (key, value) => {
      setSearchParams(serialiseFilters(removeFilter(filters, key, value)))
    },
    [filters, setSearchParams],
  )

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return {
    ...state,
    filters,
    isLoading,
    error,
    setFilters,
    setPage,
    toggleFilter,
    clearOne,
    reset,
    clearAll: clearFilters,
    retry,
  }
}

/**
 * Filter option facets, fetched once.
 *
 * The API returns both the configured option lists and live counts, so the
 * sidebar can only ever offer a filter the endpoint accepts.
 */
export function useCatalogFacets() {
  const [facets, setFacets] = useState({ facets: null, options: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    apiRequest('/listings/facets', { signal: controller.signal })
      .then((response) => {
        if (isActive) {
          setFacets(response)
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
  }, [])

  return { ...facets, isLoading, error }
}

/** Debounced typeahead suggestions for the search bar. */
export function useSearchSuggestions(term, { minLength = 2, delay = 220 } = {}) {
  const [data, setData] = useState({ suggestions: [], popular: [] })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const trimmed = term.trim()

    if (trimmed.length < minLength) {
      setData({ suggestions: [], popular: [] })
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    setIsLoading(true)

    const timer = window.setTimeout(async () => {
      try {
        const response = await apiRequest(
          `/listings/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        )
        if (isActive) {
          setData(response)
        }
      } catch {
        // Suggestions are an enhancement; a failure leaves the plain search
        // field working rather than surfacing an error.
        if (isActive) {
          setData({ suggestions: [], popular: [] })
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }, delay)

    return () => {
      isActive = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [term, minLength, delay])

  return { ...data, isLoading }
}
