import { Leaf, Target, Eye, Heart } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { SUSTAINABILITY_POINTS } from '../content/policy-content.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { StaticPageLayout } from './StaticPageLayout.jsx'

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    description:
      'The grade, the battery percentage, and the marks on the frame are published before you pay, not discovered after delivery.',
  },
  {
    icon: Target,
    title: 'Affordability',
    description:
      'Students and young professionals should be able to buy a capable phone without a brand-new price tag.',
  },
  {
    icon: Heart,
    title: 'Quality',
    description:
      'An eleven-point inspection runs on every device before a listing can be approved.',
  },
  {
    icon: Leaf,
    title: 'Sustainability',
    description:
      'Keeping a good phone in service for three more years beats discarding working hardware.',
  },
]

/** Company story, mission, vision, values, and the environmental case. */
export function AboutPage() {
  return (
    <StaticPageLayout
      eyebrow="Our story"
      title="A student-founded startup making quality smartphones accessible"
      lede="ReFon was built by a small team of BSCS students who kept watching friends hesitate on secondhand phones — not because the hardware was bad, but because nobody would tell them the truth about it."
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'About' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <div className="space-y-6 text-base leading-body text-muted">
        <p>
          The pattern was familiar. A friend would find an iPhone 13 for a third of
          the price, feel uncertain, and pass. Would the battery be drained? Was
          something quietly wrong? Had it been repaired badly? Was the seller
          real? Every question had to be answered by hand, from a stranger, with
          nothing held in reserve.
        </p>
        <p>
          ReFon exists to answer those questions once, properly, and in a way that
          scales. Every phone is inspected, graded, and published with the same
          detail, so a buyer can compare devices the way they would compare new
          ones — on specifications, price, and provable condition.
        </p>
        <p>
          We are a Technopreneurship project built around a real problem in the
          Philippine market. The ambition is for ReFon to operate like a genuine
          technology startup: a moderated marketplace, verified sellers,
          administered warranties, and a checkout that calculates totals on our
          own servers.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <section className="rounded-card-lg border border-primary-100 bg-primary-50 p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Our mission</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            To make reliable smartphones more affordable and accessible, by
            replacing uncertainty with published, measurable condition data.
          </p>
        </section>
        <section className="rounded-card-lg border border-accent-100 bg-accent-50 p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Our vision</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            To build the trusted digital marketplace for refurbished technology in
            the Philippines — the default first stop before buying new.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">What we value</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-4 rounded-card-lg border border-line bg-white p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-body text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 rounded-card-xl border border-accent-100 bg-accent-50 p-7">
        <Leaf className="size-8 text-accent-700" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
          Better for your wallet. Better for the planet.
        </h2>
        <p className="mt-3 text-sm leading-body text-muted">
          Refurbished devices are not a compromise on sustainability — in most cases
          they are the better option on both axes at once.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {SUSTAINABILITY_POINTS.map((point) => (
            <li
              key={point.title}
              className="rounded-2xl border border-white bg-white/70 px-4 py-3.5"
            >
              <p className="text-sm font-bold text-ink">{point.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{point.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <ButtonLink to={MARKETPLACE_ROUTES.sustainability} variant="accent" size="md">
            Read our sustainability commitment
          </ButtonLink>
        </div>
      </div>
    </StaticPageLayout>
  )
}

export function SustainabilityPage() {
  return (
    <StaticPageLayout
      eyebrow="Sustainability"
      title="Better for your wallet. Better for the planet."
      lede="Buying refurbished is not settling. In most cases it is the choice that costs less and wastes less at the same time."
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Sustainability' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <div className="space-y-6 text-base leading-body text-muted">
        <p>
          Smartphone production carries a real environmental cost: mined materials,
          energy-intensive manufacturing, and shipping across continents. A device
          that already works does not need any of that to serve another owner.
        </p>
        <p>
          Every refurbished phone sold on ReFon is one that stays in service instead
          of being discarded, and one that does not have to be manufactured to
          replace it.
        </p>
      </div>

      <ul className="mt-10 space-y-4">
        {SUSTAINABILITY_POINTS.map((point, index) => (
          <li
            key={point.title}
            className="flex items-start gap-4 rounded-card-lg border border-line bg-white p-6"
          >
            <span className="font-display text-2xl font-bold text-accent-600">
              0{index + 1}
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{point.title}</h2>
              <p className="mt-1.5 text-sm leading-body text-muted">{point.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-card-lg border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Honest caveat
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Reuse is not automatically the lowest-impact option in every case, and we
          will not overstate the claim. What we can say plainly is that extending the
          life of a working phone avoids most of the manufacturing impact of its
          replacement, and that a device kept in use by a student or a young
          professional is a device that never became waste.
        </p>
      </div>
    </StaticPageLayout>
  )
}
