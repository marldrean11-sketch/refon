import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3, CornerDownLeft, Search, TrendingUp, X } from 'lucide-react'
import { useSearchSuggestions } from '../../features/catalog/useCatalog.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

export const SEARCH_PLACEHOLDER = 'Search iPhone, Samsung, Pixel…'

const POPULAR_KEY = 'refon:recent-searches'
const MAX_RECENT = 5

/**
 * Recent searches, stored locally.
 *
 * Search terms are not account data and are never sent anywhere else; keeping
 * them in `localStorage` means a returning shopper gets their own history
 * without a profile lookup.
 */
export function readRecentSearches() {
  try {
    const stored = window.localStorage.getItem(POPULAR_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : []
  } catch {
    return []
  }
}

function writeRecent(terms) {
  try {
    window.localStorage.setItem(POPULAR_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)))
  } catch {
    // Storage can be unavailable in private modes. Recent searches are a nicety.
  }
}

/** Exported so the navbar's search overlay writes to the same history. */
export function rememberSearch(term) {
  const trimmed = term.trim()
  if (!trimmed) return
  writeRecent([trimmed, ...readRecentSearches().filter((entry) => entry !== trimmed)])
}

/**
 * Header search with typeahead.
 *
 * Suggestions come from `GET /listings/suggest`, which reads approved catalog
 * rows only. Every suggestion therefore points at results that exist, so the
 * dropdown can never offer a product the shopper cannot find.
 *
 * The field is presented as an instrument input: a square-cornered well with a
 * hairline that thickens on focus, and a live result count in the corner so the
 * shopper can see the catalogue responding before they press Enter.
 */
export function SearchBar({
  className = '',
  defaultValue = '',
  autoFocus = false,
  showSuggestions = true,
  onSubmitted,
}) {
  const [term, setTerm] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [recent, setRecent] = useState([])
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  // Two SearchBars can be on one page (header and shop header), so ids are
  // generated per instance rather than hardcoded.
  const fieldId = useId()
  const listboxId = `${fieldId}-suggestions`
  const { suggestions, popular } = useSearchSuggestions(
    showSuggestions ? term : '',
    { minLength: 2 },
  )

  useEffect(() => {
    setTerm(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (isOpen) {
      setRecent(readRecentSearches())
    }
  }, [isOpen])

  // Clicking anywhere outside closes the panel, including on scroll, which would
  // otherwise leave a floating panel over the page.
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  function goTo(query) {
    rememberSearch(query)
    setRecent(readRecentSearches())
    setIsOpen(false)
    inputRef.current?.blur()
    onSubmitted?.(query)

    const trimmed = query.trim()
    navigate(
      trimmed
        ? `${MARKETPLACE_ROUTES.shop}?search=${encodeURIComponent(trimmed)}`
        : MARKETPLACE_ROUTES.shop,
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    goTo(term)
  }

  const trimmedTerm = term.trim()
  const hasSuggestions = suggestions.length > 0
  const showPanel =
    showSuggestions &&
    isOpen &&
    (trimmedTerm.length >= 2 || recent.length > 0 || popular.length > 0)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form role="search" onSubmit={handleSubmit}>
        <label htmlFor={fieldId} className="sr-only">
          Search refurbished phones
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <input
          id={fieldId}
          ref={inputRef}
          type="search"
          value={term}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(event) => {
            setTerm(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={SEARCH_PLACEHOLDER}
          className="h-11 w-full rounded-control border border-line-2 bg-surface-2 pl-9 pr-9 font-mono text-[13px] font-medium text-ink transition duration-150 placeholder:font-sans placeholder:text-sm placeholder:text-subtle hover:border-line-2 hover:bg-surface focus:border-primary-950 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-950/15"
        />
        {term ? (
          <button
            type="button"
            onClick={() => {
              setTerm('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[3px] text-muted transition hover:bg-surface-3 hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </form>

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Phone suggestions"
          className="absolute left-0 right-0 top-full z-drawer mt-1.5 max-h-96 overflow-y-auto rounded-card border border-line-2 bg-surface p-1.5 shadow-pop"
        >
          {hasSuggestions ? (
            <>
              <p className="px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                In the catalog
              </p>
              {suggestions.map((entry) => (
                <button
                  key={entry.query}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setTerm(entry.label)
                    goTo(entry.query)
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {entry.label}
                    </span>
                    {entry.variants > 1 && (
                      <span className="mt-0.5 block font-mono text-[11px] text-subtle">
                        {entry.variants} variants listed
                      </span>
                    )}
                  </span>
                  {entry.grade && (
                    <span className="shrink-0 rounded-sm bg-accent-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-800 ring-1 ring-inset ring-accent-300">
                      Grade {entry.grade}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            trimmedTerm.length >= 2 && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => goTo(trimmedTerm)}
                className="flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-2.5 text-left transition hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    Search for “{trimmedTerm}”
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">
                    <CornerDownLeft className="size-3" aria-hidden="true" />
                    Press Enter
                  </span>
                </span>
                <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
            )
          )}

          {recent.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 border-t border-line px-2.5 pb-1 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                <Clock3 className="size-3" aria-hidden="true" />
                Recent searches
              </p>
              {recent.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setTerm(entry)
                    goTo(entry)
                  }}
                  className="block w-full truncate rounded-control px-2.5 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  {entry}
                </button>
              ))}
            </>
          )}

          {!hasSuggestions && popular.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 border-t border-line px-2.5 pb-1 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                <TrendingUp className="size-3" aria-hidden="true" />
                Most listed
              </p>
              {popular.slice(0, 4).map((entry) => (
                <button
                  key={entry.query}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setTerm(entry.label)
                    goTo(entry.query)
                  }}
                  className="block w-full truncate rounded-control px-2.5 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  {entry.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}