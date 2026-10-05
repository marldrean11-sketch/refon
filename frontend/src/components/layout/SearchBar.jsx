import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3, Search, TrendingUp, X } from 'lucide-react'
import { useSearchSuggestions } from '../../features/catalog/useCatalog.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

export const SEARCH_PLACEHOLDER = 'Search iPhone, Samsung, Pixel, gaming phones...'

const POPULAR_KEY = 'refon:recent-searches'
const MAX_RECENT = 5

/**
 * Recent searches, stored locally.
 *
 * Search terms are not account data and are never sent anywhere else; keeping
 * them in `localStorage` means a returning shopper gets their own history
 * without a profile lookup.
 */
function readRecent() {
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

function rememberSearch(term) {
  const trimmed = term.trim()
  if (!trimmed) return
  writeRecent([trimmed, ...readRecent().filter((entry) => entry !== trimmed)])
}

/**
 * Header search with typeahead.
 *
 * Suggestions come from `GET /listings/suggest`, which reads approved catalog
 * rows only. Every suggestion therefore points at results that exist, so the
 * dropdown can never offer a product the shopper cannot find.
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
      setRecent(readRecent())
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
    setRecent(readRecent())
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
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
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
          className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-10 text-sm font-medium text-ink shadow-sm transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Phone suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-card-lg border border-line bg-white p-2 shadow-card-hover"
        >
          {hasSuggestions ? (
            <>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Phones in the catalog
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
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-canvas"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {entry.label}
                    </span>
                    {entry.variants > 1 && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {entry.variants} variants listed
                      </span>
                    )}
                  </span>
                  {entry.grade && (
                    <span className="shrink-0 rounded-pill bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-800">
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
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-canvas"
              >
                <span className="truncate text-sm font-semibold text-ink">
                  Search for “{trimmedTerm}”
                </span>
                <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
            )
          )}

          {recent.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 border-t border-line px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
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
                  className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink"
                >
                  {entry}
                </button>
              ))}
            </>
          )}

          {!hasSuggestions && popular.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 border-t border-line px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
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
                  className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink"
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
