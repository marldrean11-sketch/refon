/**
 * New Arrivals.
 *
 * The homepage's one piece of live inventory, and the section that has to earn the
 * right to exist: a phone marketplace's homepage should end on actual phones, not
 * on copy about phones.
 *
 * Three decisions worth stating:
 *
 *   - **Tabs filter the array that is already loaded.** The page fetched the
 *     approved catalog for the hero and the category counts; tabbing re-filters
 *     that array rather than issuing a new request, so a tab change is instant and
 *     cannot fail. Every tab is therefore guaranteed to be as fresh as the page.
 *   - **"Newest" is `createdAt`, descending.** ReFon's listings are individually
 *     created by sellers, so this is genuinely the most recently listed, not a
 *     marketing category with no definition.
 *   - **The underline is one element with a shared `layoutId`.** It animates
 *     between tab positions rather than being redrawn, which is the only way to
 *     get a slide rather than a blink, and it means there can never be two
 *     underlines overlapping during the change.
 *
 * A tab with nothing in it is removed rather than shown disabled, because an empty
 * tab is a dead end.
 */
import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '../design/Container.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { stagger, usePrefersReducedMotion } from '../../lib/motion.ts'
import { HomeListingCard, HomeListingCardSkeleton } from './HomeListingCard.jsx'

/** Cards per tab. Four fills a 4-up row without leaving the grid ragged. */
const PER_TAB = 8

const SKELETON_COUNT = 4

/**
 * The tabs.
 *
 * Each is a predicate over a listing, so the count and the filtered set can never
 * disagree, and each links to the equivalent filtered shop URL for anyone who
 * wants more than a homepage's worth.
 */
const TABS = [
  { key: 'all', label: 'All', match: () => true, href: MARKETPLACE_ROUTES.shop },
  {
    key: 'iphone',
    label: 'iPhone',
    match: (listing) => listing.brand === 'Apple',
    href: `${MARKETPLACE_ROUTES.shop}?brand=Apple`,
  },
  {
    key: 'samsung',
    label: 'Samsung',
    match: (listing) => listing.brand === 'Samsung',
    href: `${MARKETPLACE_ROUTES.shop}?brand=Samsung`,
  },
  {
    key: 'budget',
    label: 'Under 10k',
    match: (listing) => Number(listing.price) < 10000,
    href: `${MARKETPLACE_ROUTES.shop}?maxPrice=10000`,
  },
]

export function NewArrivalsSection({ listings = [], isLoading = false }) {
  const reducedMotion = usePrefersReducedMotion()
  const [activeKey, setActiveKey] = useState('all')
  const tabRefs = useRef({})

  const available = useMemo(() => {
    const byKey = new Map()

    for (const tab of TABS) {
      const matched = listings
        .filter(tab.match)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, PER_TAB)

      // A tab with nothing in it is dropped rather than shown disabled.
      if (matched.length > 0) {
        byKey.set(tab.key, { tab, listings: matched })
      }
    }

    return byKey
  }, [listings])

  // The catalog can change under a visitor — a seller lists something, or the last
  // phone in a tab is bought — and the active tab can vanish. Falling back to the
  // first available tab keeps the section from rendering an empty grid.
  const active = available.get(activeKey) ?? available.values().next().value ?? null

  function onKeyDown(event) {
    const keys = [...available.keys()]
    const currentIndex = active ? keys.indexOf(active.tab.key) : -1

    if (currentIndex < 0) {
      return
    }

    let nextIndex = null

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % keys.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + keys.length) % keys.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = keys.length - 1
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    setActiveKey(keys[nextIndex])
    // Roving focus: the arrow key moves the selection *and* the focus, which is
    // what a tablist has to do or a keyboard user ends up typing at the wrong tab.
    tabRefs.current[keys[nextIndex]]?.focus()
  }

  return (
    <section aria-labelledby="arrivals-heading" className="bg-page pb-10 pt-6 lg:pb-14 lg:pt-10">
      <Container>
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Just listed
          </p>
          <h2 id="arrivals-heading" className="mt-2.5 text-title font-bold tracking-tight text-ink">
            New arrivals
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-body text-muted">
            The most recently listed phones, most recent first. Every one has been
            inspected before it appeared here.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter new arrivals"
          onKeyDown={onKeyDown}
          data-testid="arrivals-tablist"
          className="mt-9 flex flex-wrap items-center justify-center gap-1"
        >
          {[...available.values()].map(({ tab, listings: matched }) => {
            const isActive = active?.tab.key === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                ref={(node) => {
                  tabRefs.current[tab.key] = node
                }}
                aria-selected={isActive}
                aria-controls="arrivals-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveKey(tab.key)}
                data-testid="arrivals-tab"
                className={`relative min-h-11 rounded-control px-4 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                  isActive ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-[13px] tabular-nums text-subtle">
                  {matched.length}
                </span>

                {isActive ? (
                  <motion.span
                    data-testid="arrivals-underline"
                    layoutId={reducedMotion ? 'arrivals-underline-static' : 'arrivals-underline'}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 380, damping: 32 }
                    }
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent"
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <div
          id="arrivals-panel"
          role="tabpanel"
          aria-label={active ? `${active.tab.label} arrivals` : 'Arrivals'}
          className="mt-8"
        >
          {isLoading && !active ? (
            <SkeletonGrid count={SKELETON_COUNT} reduced={reducedMotion} />
          ) : active ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.tab.key}
                data-testid="arrivals-grid"
                data-tab={active.tab.key}
                variants={reducedMotion ? undefined : stagger(0.05)}
                initial={reducedMotion ? false : 'hidden'}
                animate="visible"
                exit={reducedMotion ? undefined : { opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {active.listings.map((listing) => (
                  <HomeListingCard key={listing.id} listing={listing} />
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-center text-[15px] text-muted">
              Nothing is listed right now. The catalog is small and changes often.
            </p>
          )}
        </div>
      </Container>
    </section>
  )
}

function SkeletonGrid({ count, reduced }) {
  return (
    <div data-testid="arrivals-skeleton-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <HomeListingCardSkeleton key={index} reduced={reduced} />
      ))}
    </div>
  )
}
