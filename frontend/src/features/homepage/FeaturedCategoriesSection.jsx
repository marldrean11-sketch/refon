/**
 * Category entry points.
 *
 * Six round tiles, one per brand ReFon actually lists, plus a budget entry point.
 *
 * **Counts come from the API**, the same numbers the shop shows behind each
 * tile's link: brand counts from `/api/listings/facets`, and the budget count
 * from the budget filter itself. They used to be counted from the homepage's
 * loaded listings, which is only the first page of twelve, so "Apple 3" sat over
 * a shop page listing five. Until the counts arrive the tiles show no number
 * rather than a guess, and a brand with nothing listed is left out.
 *
 * Each tile is a shareable filtered shop URL — `/phones?brand=Apple`,
 * `/phones?maxPrice=10000` — so it is a real destination rather than a
 * client-side filter that cannot be linked.
 *
 * The tiles are **typographic**: there are no product photographs anywhere in the
 * catalog (every listing has `photos: []`), so the brand name *is* the artwork. The
 * tile is set at display size and tinted per brand from the existing token palette,
 * which is a design decision rather than a compromise: a wall of identical grey
 * circles would read as unloaded, and six big brand names read as a catalogue index.
 *
 * On phones this is a snap-scroll rail, because six round tiles in a 3×2 grid is
 * neither a grid nor a list.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api-client.js'
import { Container } from '../design/Container.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { fadeUp, stagger, usePrefersReducedMotion } from '../../lib/motion.ts'

/** Budget entry point. Matches the backend's price filters rather than inventing a route. */
const BUDGET_CEILING = 10000

/**
 * The six tiles. `brand` doubles as the display name except for the Pixel tile,
 * whose brand is Google. The budget tile has no brand; it links to the price filter.
 */
const TILES = [
  { key: 'apple', label: 'Apple', brand: 'Apple' },
  { key: 'samsung', label: 'Samsung', brand: 'Samsung' },
  { key: 'pixel', label: 'Pixel', brand: 'Google' },
  { key: 'xiaomi', label: 'Xiaomi', brand: 'Xiaomi' },
  { key: 'oppo', label: 'OPPO', brand: 'OPPO' },
  { key: 'budget', label: 'Under 10k', brand: null },
]

/** Each tile's count, keyed by tile, or null until both requests have answered. */
function useCategoryCounts() {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      apiRequest('/listings/facets', { signal: controller.signal }),
      apiRequest(`/listings?maxPrice=${BUDGET_CEILING}`, { signal: controller.signal }),
    ])
      .then(([facetResponse, budgetResponse]) => {
        const byBrand = Object.fromEntries(
          (facetResponse.facets?.brands ?? []).map((entry) => [entry.value, entry.count]),
        )

        setCounts(
          Object.fromEntries(
            TILES.map((tile) => [
              tile.key,
              tile.brand ? (byBrand[tile.brand] ?? 0) : (budgetResponse.pagination?.total ?? 0),
            ]),
          ),
        )
      })
      .catch(() => {
        // Without counts the tiles still work as links; they just show no number.
      })

    return () => controller.abort()
  }, [])

  return counts
}

/**
 * Every tile shares one ground.
 *
 * An earlier version tinted each brand with its own pair of hex values lifted from
 * `PhoneArtwork`. That was dropped: the redesign rule is that this phase introduces
 * no new colours, and six different tile grounds is also six more colours for a
 * row that has to read as one index. The brand name, set at display size, is what
 * distinguishes the tiles — which is what the shop's own category page does.
 */
const TILE_SURFACE = 'bg-panel hover:bg-well'

export function FeaturedCategoriesSection() {
  const reducedMotion = usePrefersReducedMotion()
  const counts = useCategoryCounts()

  const tiles = TILES.map((tile) => ({
    ...tile,
    count: counts ? counts[tile.key] : null,
    href: tile.brand
      ? `${MARKETPLACE_ROUTES.shop}?brand=${encodeURIComponent(tile.brand)}`
      : `${MARKETPLACE_ROUTES.shop}?maxPrice=${BUDGET_CEILING}`,
  })).filter((tile) => tile.count === null || tile.count > 0)

  return (
    <section aria-labelledby="category-heading" className="bg-page pb-4 pt-12 lg:pb-6 lg:pt-20">
      <Container size="full" className="px-4 sm:px-6 lg:px-8">
        {/* The statement line: the one sentence the whole homepage stands on,
            set big enough to read as the page's second headline. */}
        <p className="max-w-5xl font-display text-[clamp(2rem,5vw,4rem)] font-black leading-[1.02] tracking-[-0.035em] text-night [font-stretch:104%] [text-wrap:balance]">
          Secondhand phones, checked before they&rsquo;re listed.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Shop by brand
            </p>
            <h2
              id="category-heading"
              className="mt-2.5 text-title font-bold tracking-tight text-ink"
            >
              Start from the brand or the budget
            </h2>
          </div>

          <Link
            to={MARKETPLACE_ROUTES.categories}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-control text-sm font-medium text-ink underline decoration-line-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            All categories
            <ArrowSwipe />
          </Link>
        </div>

        {/*
          A snap rail, not a grid. `snap-x` plus `snap-start` means a flick lands
          on a whole tile, which is the difference between a rail and a blurry
          strip on a phone.
        */}
        <motion.ul
          variants={reducedMotion ? undefined : stagger(0.06)}
          initial={reducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          data-testid="category-rail"
          className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6"
        >
          {tiles.map((tile) => (
            <motion.li
              key={tile.key}
              variants={reducedMotion ? undefined : fadeUp}
              className="w-[9.5rem] shrink-0 snap-start sm:w-auto"
            >
              <CategoryTile tile={tile} reduced={reducedMotion} />
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  )
}

function CategoryTile({ tile, reduced }) {
  return (
    <Link
      to={tile.href}
      data-testid="category-tile"
      data-count={tile.count ?? undefined}
      data-brand={tile.brand ?? 'budget'}
      className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      {/*
        The lift and the scale live on the inner tile rather than on the link, so
        the whole target stays put while the visual moves. On hover the tile rises
        6px and grows 5%; under reduced motion it does neither, and the browser's
        own focus ring is still the only state change a keyboard user gets.
      */}
      <motion.div
        variants={reduced ? undefined : { rest: { y: 0, scale: 1 }, hover: { y: -6, scale: 1.05 } }}
        whileHover={reduced ? undefined : 'hover'}
        className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-line p-4 text-center shadow-card transition-colors duration-200 group-hover:shadow-card-hover ${TILE_SURFACE}`}
      >
        <span className="text-lg font-bold leading-tight tracking-[-0.02em] text-ink">
          {tile.label}
        </span>
        {tile.count !== null && (
          <span className="text-[13px] tabular-nums text-ink/75">
            {tile.count} {tile.count === 1 ? 'phone' : 'phones'}
          </span>
        )}
      </motion.div>
    </Link>
  )
}

function ArrowSwipe() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-150 group-hover:translate-x-1"
    >
      &#8594;
    </span>
  )
}
