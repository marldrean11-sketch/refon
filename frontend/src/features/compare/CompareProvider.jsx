import { useCallback, useEffect, useMemo, useState } from 'react'
import { COMPARE_LIMIT, CompareContext } from './compare-context.js'

const STORAGE_KEY = 'refon:compare'

/**
 * Storage can be missing or throw (private windows, blocked site data), and the
 * comparison has to keep working without it, so every read and write is guarded.
 */
function readStoredIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')

    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string').slice(0, COMPARE_LIMIT)
      : []
  } catch {
    return []
  }
}

/**
 * The phones a visitor has picked to compare.
 *
 * Client-only: a comparison is a scratchpad, not account data, so it needs no
 * API and works signed out. Only listing ids are kept; the compare page fetches
 * fresh listings, so a price that changed since the pick is never shown stale.
 */
export function CompareProvider({ children }) {
  const [ids, setIds] = useState(readStoredIds)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // Not persisted this visit; the in-memory list still works.
    }
  }, [ids])

  const has = useCallback((id) => ids.includes(id), [ids])

  /** Returns false, and changes nothing, when the list is already full. */
  const add = useCallback(
    (id) => {
      if (ids.includes(id)) {
        return true
      }

      if (ids.length >= COMPARE_LIMIT) {
        return false
      }

      setIds((current) => [...current, id])
      return true
    },
    [ids],
  )

  const remove = useCallback((id) => setIds((current) => current.filter((entry) => entry !== id)), [])
  const clear = useCallback(() => setIds([]), [])
  const replace = useCallback((next) => setIds(next.slice(0, COMPARE_LIMIT)), [])

  const value = useMemo(
    () => ({ ids, has, add, remove, clear, replace, isFull: ids.length >= COMPARE_LIMIT }),
    [ids, has, add, remove, clear, replace],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}
