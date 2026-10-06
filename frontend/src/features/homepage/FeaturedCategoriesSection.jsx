import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section } from '../../components/ui/Section.jsx'
import { PhoneArtwork } from '../listings/PhoneArtwork.jsx'
import { CATEGORIES, categoryHref } from '../../content/categories.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/** The categories promoted on the homepage, in priority order. */
const FEATURED_SLUGS = [
  'iphone',
  'samsung-galaxy',
  'google-pixel',
  'xiaomi',
  'under-10000',
  'premium-refurbished',
]

/**
 * Category entry points.
 *
 * Each card is a real link with a real device illustration, so this reads as
 * product discovery rather than a decorative icon grid. Prices are omitted on
 * purpose: the catalog price range changes with every listing, and a stale
 * number on the homepage would be a small lie.
 *
 * The layout is a six-across rail rather than a 3×2 card grid, because these
 * are entry points into a catalogue rather than six things the page is arguing
 * for. At phone widths they collapse to a horizontal scroll strip, which is what
 * a thumb expects from a category rail.
 */
export function FeaturedCategoriesSection() {
  const categories = FEATURED_SLUGS.map((slug) =>
    CATEGORIES.find((category) => category.slug === slug),
  ).filter(Boolean)

  return (
    <Section tone="white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Shop by category
          </p>
          <h2 className="mt-3 text-title font-bold tracking-tight text-ink">
            Start from the brand or the budget
          </h2>
          <p className="mt-3.5 leading-body text-muted">
            Thirteen ways into the catalog. Every category is a shareable filtered
            URL, so you can send someone straight to the phones you mean.
          </p>
        </div>
        <Link
          to={MARKETPLACE_ROUTES.categories}
          className="group inline-flex shrink-0 items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
        >
          All categories
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <ul className="-mx-4 mt-10 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.slug} className="w-64 shrink-0 sm:w-auto">
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function CategoryCard({ category }) {
  return (
    <Link
      to={categoryHref(category)}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-200 hover:border-primary-400 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <div className="relative border-b border-line">
        <PhoneArtwork
          brand={category.illustrationBrand ?? category.name}
          model={category.illustrationModel ?? category.name}
          color={category.illustrationColor}
          showLabel={false}
          className="aspect-[16/10] w-full"
        />
        <span className="absolute left-3 top-3 rounded-sm bg-surface/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted ring-1 ring-inset ring-line-2 backdrop-blur">
          {category.badge}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-ink">
          {category.name}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-body text-muted">{category.description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-800">
          Shop {category.name}
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}