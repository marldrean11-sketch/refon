/**
 * The full-screen search overlay.
 *
 * The navbar's search icon expands into this rather than the icon growing into
 * an input, because a search field that appears inside a 44px icon button is
 * unreadable at every width that matters. The overlay gives the field the whole
 * screen, which is also why it can afford live suggestions without pushing
 * anything around.
 *
 * Everything about the data is borrowed. Suggestions come from
 * `useSearchSuggestions`, which already reads `GET /listings/suggest`; recent
 * terms come from the same `localStorage` key `SearchBar` writes; submitting
 * navigates to the same `/phones?search=` route. No new API and no second source
 * of truth.
 *
 * Focus is the whole accessibility story, so it is stated plainly: opening
 * focuses the input, Tab stays inside the dialog, Escape closes and returns
 * focus to the trigger, and the dialog is `aria-modal` so assistive technology
 * treats it as the whole world.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import {
  SEARCH_PLACEHOLDER,
  readRecentSearches,
  rememberSearch,
} from '../../components/layout/SearchBar.jsx'
import { useSearchSuggestions } from '../catalog/useCatalog.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { easings, stagger, usePrefersReducedMotion } from '../../lib/motion.ts'
import { useNavbarUi } from './navbar-ui-context.jsx'

/** Elements a Tab press is allowed to land on. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function SearchOverlay({ triggerRef }) {
  const { isSearchOpen, close } = useNavbarUi()
  const reducedMotion = usePrefersReducedMotion()
  const navigate = useNavigate()

  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const { suggestions } = useSearchSuggestions(term, { minLength: 2 })

  const fieldId = useId()
  const listId = `${fieldId}-list`

  const trimmed = term.trim()
  const hasQuery = trimmed.length >= 2

  /**
   * Recent searches, read when the overlay opens rather than on every keystroke.
   *
   * Seeded as empty so the first render is correct whether or not the overlay is
   * open, and refreshed on open so it cannot go stale.
   */
  const [recent, setRecent] = useState(() => readRecentSearches())

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    setRecent(readRecentSearches())
  }, [isSearchOpen])

  // Clear the field on close so reopening starts from an empty box rather than
  // silently re-running the previous search.
  useEffect(() => {
    if (!isSearchOpen) {
      setTerm('')
      setActiveIndex(-1)
    }
  }, [isSearchOpen])

  // Focus on open; restore focus to the trigger on close. One effect, so the two
  // halves of the contract cannot drift apart.
  useEffect(() => {
    if (!isSearchOpen) {
      return undefined
    }

    inputRef.current?.focus()

    // Copied to a local: the cleanup runs on close, by which time the ref may
    // point at a different element than it did on open.
    const trigger = triggerRef?.current

    return () => {
      trigger?.focus()
    }
  }, [isSearchOpen, triggerRef])

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? [])]

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      // Wrap at both ends so Tab can never leave the dialog and wander the page
      // behind it.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, isSearchOpen])

  function goTo(query) {
    const value = query.trim()

    rememberSearch(value)
    close()
    navigate(
      value ? `${MARKETPLACE_ROUTES.shop}?search=${encodeURIComponent(value)}` : MARKETPLACE_ROUTES.shop,
    )
  }

  function onKeyDownInput(event) {
    if (suggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      )
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const entry = suggestions[activeIndex]
      goTo(entry?.label ?? entry?.model ?? term)
    }
  }

  if (typeof document === 'undefined') {
    return null
  }

  const showSuggestions = suggestions.length > 0
  const showRecent = !hasQuery && recent.length > 0
  /*
   * `popular` is deliberately not used here.
   *
   * `useSearchSuggestions` returns `{ suggestions: [], popular: [] }` until the
   * term is two characters long, so the popular list only ever arrives
   * alongside real suggestions — which is the branch above. A popular-searches
   * panel would need a second request or a change to that hook, and neither is
   * in scope for this phase.
   */

  return createPortal(
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          key="search-overlay"
          ref={dialogRef}
          data-testid="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search refurbished phones"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: easings.ui }}
          className="fixed inset-0 z-modal flex flex-col bg-page"
        >
          <div className="border-b border-line bg-card">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
              <Search className="size-5 shrink-0 text-subtle" strokeWidth={1.5} aria-hidden="true" />

              <form
                role="search"
                className="min-w-0 flex-1"
                onSubmit={(event) => {
                  event.preventDefault()
                  goTo(term)
                }}
              >
                <label htmlFor={fieldId} className="sr-only">
                  Search refurbished phones
                </label>
                <input
                  id={fieldId}
                  ref={inputRef}
                  data-testid="search-overlay-input"
                  type="search"
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
                  }
                  autoComplete="off"
                  value={term}
                  onChange={(event) => {
                    setTerm(event.target.value)
                    setActiveIndex(-1)
                  }}
                  onKeyDown={onKeyDownInput}
                  placeholder={SEARCH_PLACEHOLDER}
                  className="w-full border-0 bg-transparent text-lg text-ink outline-none placeholder:text-subtle"
                />
              </form>

              <button
                type="button"
                data-testid="search-overlay-close"
                onClick={close}
                aria-label="Close search"
                className="grid size-11 shrink-0 place-items-center rounded-control border border-line-2 bg-surface text-ink transition duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          <motion.div
            variants={reducedMotion ? undefined : stagger(0.05)}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          >
            {showSuggestions ? (
              <ul id={listId} role="listbox" aria-label="Phone suggestions">
                <li className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  In the catalog
                </li>
                {suggestions.map((entry, index) => (
                  <motion.li
                    key={entry.query ?? entry.label}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    variants={
                      reducedMotion
                        ? undefined
                        : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }
                    }
                  >
                    <button
                      type="button"
                      data-testid="search-suggestion"
                      onClick={() => goTo(entry.query ?? entry.label ?? term)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-4 rounded-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        index === activeIndex ? 'bg-surface-2' : 'hover:bg-surface-2'
                      }`}
                    >
                      <Search
                        className="size-4 shrink-0 text-subtle"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                        {entry.label}
                      </span>

                      {/*
                        The metadata the suggest endpoint actually sends: a
                        condition grade and how many devices carry it. The previous
                        row read `brand` and `model`, which this endpoint does not
                        return, so the second line rendered empty — and the Enter
                        glyph was then the only thing on the right, stranded
                        ~700px from its label.
                      */}
                      {entry.grade ? <ConditionBadge grade={entry.grade} size="sm" /> : null}

                      {entry.variants > 1 ? (
                        <span className="shrink-0 text-[13px] tabular-nums text-muted">
                          {entry.variants} listed
                        </span>
                      ) : null}

                      {index === activeIndex ? (
                        <CornerDownLeft
                          className="size-4 shrink-0 text-muted"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  </motion.li>
                ))}
              </ul>
            ) : showRecent ? (
              <div>
                <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Recent searches
                </p>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((entry) => (
                    <li key={entry}>
                      <button
                        type="button"
                        onClick={() => goTo(entry)}
                        className="rounded-control border border-line-2 bg-surface px-3 py-1.5 text-sm text-ink transition duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {entry}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="px-1 text-sm text-muted">
                {hasQuery ? 'No phones match that yet.' : 'Start typing a brand or a model.'}
              </p>
            )}
          </motion.div>

          {hasQuery && (
            <div className="border-t border-line bg-card">
              <button
                type="button"
                data-testid="search-overlay-submit"
                onClick={() => goTo(term)}
                className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    Search for “{trimmed}”
                  </span>
                  <span className="block text-[13px] text-muted">
                    Across the whole catalog
                  </span>
                </span>
                <CornerDownLeft
                  className="size-4 shrink-0 text-subtle"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}