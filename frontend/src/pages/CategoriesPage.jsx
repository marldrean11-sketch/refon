import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { PhoneArtwork } from '../features/listings/PhoneArtwork.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { CATEGORIES, categoryHref } from '../content/categories.js'

/**
 * Category landing page.
 *
 * Every card is a link to the shop page with the matching query applied, so a
 * category can be bookmarked and shared instead of living in component state.
 */
export function CategoriesPage() {
  const sections = useMemo(() => {
    const featured = CATEGORIES.slice(0, 7)
    const priceBands = CATEGORIES.slice(7)

    return { featured, priceBands }
  }, [])

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Categories' },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Shop refurbished phones by category
            </h1>
            <p className="mt-4 text-lg leading-body text-muted">
              Start from the brand or the budget. Every phone in every category is
              inspected, graded, and published with its real battery health.
            </p>
          </div>
        </div>
      </div>

      <Section>
        <SectionHeading
          eyebrow="Browse by brand"
          title="Every major brand, graded and tested"
          description="These categories cover the models students and young professionals ask for most often."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.featured.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Shop by budget and grade"
          title="Find the price that works for you"
          description="Budget tiers and our premium Grade A selection, so you can narrow the catalog in one tap."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.priceBands.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" size="lg">
            Browse the full catalog
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}

function CategoryCard({ category }) {
  return (
    <Link
      to={categoryHref(category)}
      className="group relative flex h-full flex-col overflow-hidden rounded-card-lg border border-line bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover"
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
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          {category.name}
        </h2>
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
