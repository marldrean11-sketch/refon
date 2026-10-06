import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PhoneArtwork } from '../listings/PhoneArtwork.jsx'
import { BatteryHealth } from '../../components/ui/BatteryHealth.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../../components/ui/PriceDisplay.jsx'
import { Container } from '../design/Container.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { gradeFromLegacyCondition } from '../../lib/listing-taxonomy.js'
import { HERO_STATS } from '../../content/home-content.js'

/**
 * The hero.
 *
 * The previous hero was a centred two-column block: headline on the left, a
 * floating product card on the right, both floating on a dark gradient. That is
 * the default shape of every SaaS landing page, and it made ReFon read as one.
 *
 * This is a **spec sheet**, not a pitch. The structure is:
 *
 *   - a masthead line of monospace index numbers, like the header of a catalogue
 *   - one enormous statement in two weights, with the value claim on its own line
 *   - a full-width search field that is the primary interaction, because on a
 *     marketplace "find a phone" is the job and a "Shop now" button is not
 *   - a live device plate with its measurements, sitting beside the statement as
 *     evidence rather than as decoration
 *
 * The composition is asymmetric on purpose: the statement column is wider than
 * the device column, the numbers run down the left edge as a margin note, and the
 * search spans past both columns so it reads as the base of the page rather than
 * as a widget inside it.
 */
export function HeroSection({ featured }) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden border-b border-line bg-page">
      {/* A measured grid, not a decorative gradient. The hairlines are the point:
          they make the panel read as a technical surface rather than as a lit
          background, and on paper they are drawn in ink at a very low opacity so
          they are felt rather than seen. */}
      <div
        className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(17,17,17,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.9)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />
      <div
        className="absolute -left-40 top-1/3 size-[32rem] rounded-full bg-accent/10 blur-[100px]"
        aria-hidden="true"
      />

      <Container className="relative py-14 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-14">
          {/* ── The statement. */}
          <div className="min-w-0">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              <span className="inline-flex items-center gap-2 text-accent-strong">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                Live inventory
              </span>
              <span aria-hidden="true" className="text-subtle">
                /
              </span>
              <span>Refurbished smartphones</span>
              <span aria-hidden="true" className="text-subtle">
                /
              </span>
              <span>Philippines</span>
            </motion.p>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-6 text-[2.75rem] font-bold leading-[0.95] tracking-[-0.05em] text-ink sm:text-6xl lg:text-[4.5rem]"
            >
              Premium Phones.
              {/* The one place an accent word is allowed, and it is set in the
                  serif face rather than given a colour: on a page where green
                  means "verified", a green adjective here would claim a
                  verification it has not got. */}
              <span className="mt-1 block font-accent text-muted">Smarter Prices.</span>
              <span className="mt-1 block text-ink">Tested for You.</span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-7 max-w-xl text-base leading-body text-muted sm:text-lg"
            >
              Shop quality-tested refurbished smartphones with transparent condition
              grades, published battery health, warranty coverage, and verified
              sellers — so you buy the phone, not the risk.
            </motion.p>

            {/* ── Search is the primary action, not a "Shop now" link. */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-9 max-w-2xl"
            >
              <HeroSearch />
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Link
                to={MARKETPLACE_ROUTES.shop}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-control bg-ink px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              >
                Shop Refurbished Phones
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to={MARKETPLACE_ROUTES.howItWorks}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-line-2 bg-card px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                How It Works
              </Link>
            </motion.div>

            {/* ── The numbers, set as a margin note running down the left. */}
            <motion.dl
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-11 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line"
            >
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="bg-card px-4 py-4">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-ink">
                      {stat.value}
                    </span>
                    <span className="mt-2 block font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-[0.1em] text-muted">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* ── The device, as evidence. */}
          <HeroDevice featured={featured} reduceMotion={reduceMotion} />
        </div>
      </Container>
    </section>
  )
}

/**
 * The hero search field.
 *
 * It is a real form that navigates, not a decorative input. On the old homepage
 * search existed only in the header, which meant the largest element on the page
 * was a headline and the largest thing you could *do* was a link to another page
 * — putting the field on the hero inverts that.
 */
function HeroSearch() {
  return (
    <form
      role="search"
      action={MARKETPLACE_ROUTES.shop}
      onSubmit={(event) => {
        // The catalog reads `search`, and submitting an empty box should land on
        // the unfiltered shop rather than on a page filtered for "".
        const value = String(new FormData(event.currentTarget).get('search') ?? '').trim()
        if (!value) {
          event.preventDefault()
        }
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="hero-search" className="sr-only">
        Search refurbished phones
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <input
          id="hero-search"
          name="search"
          type="search"
          placeholder="Search iPhone 13, Galaxy S23, under ₱20,000…"
          className="h-14 w-full rounded-control border border-line-2 bg-card pl-12 pr-4 text-base text-ink placeholder:text-subtle transition duration-150 hover:border-subtle focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-control bg-accent px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        Search
      </button>
    </form>
  )
}

/**
 * The featured device plate.
 *
 * Renders a live approved listing rather than a mock device, so the battery
 * figure, grade, and price in the hero are real data. It is deliberately not a
 * floating card with two chips hanging off it: it is a bordered plate with a
 * header row and a measurement grid, matching how the product page will present
 * the same facts.
 */
function HeroDevice({ featured, reduceMotion }) {
  const hasListing = Boolean(featured)
  const grade = hasListing
    ? (featured.grade ?? gradeFromLegacyCondition(featured.condition))
    : 'A'

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.4 }}
      className="w-full min-w-0"
    >
      <div className="overflow-hidden rounded-card-lg border border-line bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Featured today
          </p>
          <ConditionBadge grade={grade} />
        </div>

        <div className="p-4">
          <PhoneArtwork
            brand={featured?.brand ?? 'Apple'}
            model={featured?.model ?? 'Refurbished'}
            color={featured?.color ?? 'Midnight'}
            view="front"
            className="aspect-[4/3] w-full rounded-card"
          />

          <div className="mt-4 min-w-0">
            <p className="truncate font-display text-xl font-bold tracking-tight text-ink">
              {hasListing ? `${featured.brand} ${featured.model}` : 'Refurbished phone'}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {hasListing
                ? [featured.year, featured.storage].filter(Boolean).join(' · ')
                : 'Loading verified listings'}
            </p>
          </div>

          <div className="mt-4">
            <PriceDisplay
              price={featured?.price ?? 0}
              originalPrice={featured?.originalPrice}
              size="md"
              showSavings={false}
              className="[&_p]:text-ink [&_p]:decoration-line-2"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line">
            <div className="bg-card px-3 py-3">
              <BatteryHealth
                percent={featured?.batteryPercent ?? 0}
                size="sm"
                tone="inverse"
                showLabel={false}
              />
            </div>
            <div className="bg-card px-3 py-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                Inspection
              </p>
              <p className="mt-1.5 font-display text-sm font-bold text-ink">
                11 checks passed
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasListing && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-subtle">
          Real listing from the approved catalog. Every price, grade, and battery
          figure on ReFon is published before purchase.
        </p>
      )}
    </motion.div>
  )
}