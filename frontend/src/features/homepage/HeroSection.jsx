import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BatteryCharging, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PhoneArtwork } from '../listings/PhoneArtwork.jsx'
import { BatteryHealth } from '../../components/ui/BatteryHealth.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { WarrantyBadge } from '../../components/ui/WarrantyBadge.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { formatPeso } from '../../lib/format.js'
import { gradeFromLegacyCondition } from '../../lib/listing-taxonomy.js'
import { HERO_STATS } from '../../content/home-content.js'

const heroBadge =
  'inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-100 backdrop-blur'

const heroPrimaryCta =
  'group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-950/25 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950 motion-reduce:transform-none motion-reduce:transition-none'

const heroSecondaryCta =
  'inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-6 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transform-none motion-reduce:transition-none'

/**
 * Hero.
 *
 * The headline states what ReFon sells and what makes it different in one
 * breath. The composition on the right is a real approved listing, so the
 * trust signals shown in the hero are the same signals that appear on the shop
 * page rather than decorative placeholders.
 */
export function HeroSection({ featured }) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-primary-950 text-white">
      <div
        className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:54px_54px]"
        aria-hidden="true"
      />
      <div
        className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-primary-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-52 right-0 size-[38rem] rounded-full bg-accent-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={heroBadge}
          >
            <Sparkles className="size-3.5 text-accent-400" aria-hidden="true" />
            Tested, graded, and published
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-7 text-[2.5rem] font-semibold leading-[1.03] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl"
          >
            Premium Phones.{' '}
            <span className="text-accent-300">Smarter Prices.</span>
            <br className="hidden sm:block" /> Tested for You.
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 max-w-xl text-lg leading-body text-primary-100/85"
          >
            Shop quality-tested refurbished smartphones with transparent condition
            grades, published battery health, warranty coverage, and verified
            sellers — so you buy the phone, not the risk.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link to={MARKETPLACE_ROUTES.shop} className={heroPrimaryCta}>
              Shop Refurbished Phones
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
            <Link to={MARKETPLACE_ROUTES.howItWorks} className={heroSecondaryCta}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              How It Works
            </Link>
          </motion.div>

          <motion.dl
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            className="mt-11 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7"
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-2xl font-bold text-white sm:text-3xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-primary-200/70 sm:text-sm">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <HeroPhone featured={featured} reduceMotion={reduceMotion} />
      </div>
    </section>
  )
}

/**
 * Product composition.
 *
 * Renders a live approved listing rather than a mock device, so the battery
 * figure, grade, and warranty in the hero are real data. Falls back to a
 * neutral placeholder while listings load so the layout never collapses.
 */
function HeroPhone({ featured, reduceMotion }) {
  const hasListing = Boolean(featured)
  const grade = hasListing
    ? (featured.grade ?? gradeFromLegacyCondition(featured.condition))
    : 'A'

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative overflow-hidden rounded-card-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-300">
              Featured today
            </p>
            <p className="mt-1.5 truncate font-display text-xl font-semibold text-white">
              {hasListing ? `${featured.brand} ${featured.model}` : 'Refurbished phone'}
            </p>
            <p className="mt-0.5 text-sm text-primary-100/70">
              {hasListing
                ? [featured.year, featured.storage].filter(Boolean).join(' • ')
                : 'Loading verified listings'}
            </p>
          </div>
          <ConditionBadge grade={grade} size="lg" />
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-5 overflow-hidden rounded-card-lg"
        >
          <PhoneArtwork
            brand={featured?.brand ?? 'Apple'}
            model={featured?.model ?? 'Refurbished'}
            color={featured?.color ?? 'Midnight'}
            view="front"
            className="aspect-[4/3] w-full"
          />
        </motion.div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 p-4">
            <BatteryHealth
              percent={featured?.batteryPercent ?? 0}
              size="sm"
              tone="inverse"
            />
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-semibold text-primary-100/70">Price</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {hasListing ? formatPeso(featured.price) : '₱—'}
            </p>
            <div className="mt-2">
              <WarrantyBadge months={featured?.warrantyMonths ?? 0} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat cards sit outside the panel so they never cover the
          price, battery figure, or condition badge they sit next to. */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute -left-8 top-1/3 hidden w-48 rounded-2xl border border-line bg-white p-4 shadow-card-hover xl:block"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
            <BatteryCharging className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">Battery measured</p>
            <p className="font-display text-base font-bold text-ink">
              {hasListing ? `${featured.batteryPercent}%` : '—'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.36, duration: 0.4 }}
        className="absolute -right-8 bottom-1/4 hidden w-52 rounded-2xl border border-line bg-white p-4 shadow-card-hover xl:block"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">Inspection</p>
            <p className="font-display text-base font-bold text-ink">11 checks passed</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
