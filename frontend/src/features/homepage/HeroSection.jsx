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
    <section className="relative overflow-hidden bg-primary-950 text-white">
      {/* A measured grid, not a decorative gradient. The hairlines are the point:
          they make the dark panel read as a technical surface rather than as a
          lit background. */}
      <div
        className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />
      <div
        className="absolute -left-40 top-1/3 size-[32rem] rounded-full bg-accent-600/10 blur-[100px]"
        aria-hidden="true"
      />

      <Container className="relative py-14 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-14">
          {/* ── The statement. */}
          <div className="min-w-0">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-400"
            >
              <span className="inline-flex items-center gap-2 text-accent-300">
                <span className="size-1.5 rounded-full bg-accent-400" aria-hidden="true" />
                Live inventory
              </span>
              <span aria-hidden="true" className="text-primary-700">
                /
              </span>
              <span>Refurbished smartphones</span>
              <span aria-hidden="true" className="text-primary-700">
                /
              </span>
              <span>Philippines</span>
            </motion.p>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-6 text-[2.75rem] font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-[4.5rem]"
            >
              Premium Phones.
              <span className="mt-1 block text-primary-400">Smarter Prices.</span>
              <span className="mt-1 block text-white">Tested for You.</span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-7 max-w-xl text-base leading-body text-primary-200 sm:text-lg"
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
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-control bg-white px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-950 transition duration-150 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950"
              >
                Shop Refurbished Phones
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to={MARKETPLACE_ROUTES.howItWorks}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-primary-700 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-100 transition duration-150 hover:border-primary-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950"
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
              className="mt-11 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-card border border-primary-800 bg-primary-800"
            >
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="bg-primary-950 px-4 py-4">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-white">
                      {stat.value}
                    </span>
                    <span className="mt-2 block font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-[0.1em] text-primary-400">
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
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary-400"
          aria-hidden="true"
        />
        <input
          id="hero-search"
          name="search"
          type="search"
          placeholder="Search iPhone 13, Galaxy S23, under ₱20,000…"
          className="h-14 w-full rounded-control border border-primary-700 bg-white/[0.06] pl-12 pr-4 text-base text-white placeholder:text-primary-500 transition duration-150 hover:border-primary-500 focus:border-white focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-control bg-accent-500 px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950"
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
      <div className="overflow-hidden rounded-card-lg border border-primary-800 bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3 border-b border-primary-800 px-4 py-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-400">
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
            className="aspect-[4/3] w-full rounded-control"
          />

          <div className="mt-4 min-w-0">
            <p className="truncate font-display text-xl font-bold tracking-tight text-white">
              {hasListing ? `${featured.brand} ${featured.model}` : 'Refurbished phone'}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-primary-400">
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
              className="[&_p]:text-white [&_p]:decoration-primary-600"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-control border border-primary-800 bg-primary-800">
            <div className="bg-primary-950 px-3 py-3">
              <BatteryHealth
                percent={featured?.batteryPercent ?? 0}
                size="sm"
                tone="inverse"
                showLabel={false}
              />
            </div>
            <div className="bg-primary-950 px-3 py-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-400">
                Inspection
              </p>
              <p className="mt-1.5 font-display text-sm font-bold text-white">
                11 checks passed
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasListing && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-primary-500">
          Real listing from the approved catalog. Every price, grade, and battery
          figure on ReFon is published before purchase.
        </p>
      )}
    </motion.div>
  )
}