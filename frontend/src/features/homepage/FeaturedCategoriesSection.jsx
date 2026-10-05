import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
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
 */
export function FeaturedCategoriesSection() {
  const categories = FEATURED_SLUGS.map((slug) =>
    CATEGORIES.find((category) => category.slug === slug),
  ).filter(Boolean)

  return (
    <Section tone="white">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Shop by category"
          title="Start from the brand or the budget"
          description="Thirteen ways into the catalog. Every category is a shareable filtered URL, so you can send someone straight to the phones you mean."
          className="sm:max-w-2xl"
        />
        <Link
          to={MARKETPLACE_ROUTES.categories}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
        >
          All categories
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.slug}>
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
      className="group relative flex h-full flex-col overflow-hidden rounded-card-lg border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="relative">
        <PhoneArtwork
          brand={category.illustrationBrand ?? category.name}
          model={category.illustrationModel ?? category.name}
          color={category.illustrationColor}
          showLabel={false}
          className="aspect-[16/9] w-full"
        />
        <span className="absolute left-4 top-4 rounded-pill bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted shadow-sm backdrop-blur">
          {category.badge}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
          {category.name}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-body text-muted">{category.description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
          Shop {category.name}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}
