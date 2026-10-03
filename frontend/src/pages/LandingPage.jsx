import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  Camera,
  ClipboardCheck,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UploadCloud,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { useApprovedListings } from '../features/listings/useApprovedListings.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'

const moderationSteps = [
  {
    number: '01',
    icon: UploadCloud,
    title: 'Seller submits',
    description:
      'Sellers add model details, condition notes, battery health, storage, and photos.',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: 'Moderators review',
    description:
      'The listing is checked for clarity, accuracy, completeness, and marketplace rules.',
  },
  {
    number: '03',
    icon: BadgeCheck,
    title: 'Trust is applied',
    description:
      'Approved listings receive visible moderation and verified-seller signals.',
  },
  {
    number: '04',
    icon: MessageCircle,
    title: 'Buyers engage',
    description:
      'Shoppers compare transparent details and contact the seller with confidence.',
  },
]

const heroStats = [
  { value: '2015–2024', label: 'Supported model years' },
  { value: '100%', label: 'Moderated listings' },
  { value: 'Clear', label: 'Battery & condition data' },
]

function HeroDevice({ featuredPhone }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative mx-auto h-[31rem] w-full max-w-lg sm:h-[35rem] lg:max-w-none">
      <div
        className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute right-4 top-10 size-40 rounded-full bg-accent-400/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="absolute left-1/2 top-1/2 z-10 h-[27rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 sm:h-[30rem] sm:w-[15.5rem]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: -5 }}
          animate={{ opacity: 1, y: 0, rotate: -5 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="h-full w-full rounded-[3rem] border-[8px] border-slate-950 bg-gradient-to-b from-slate-800 to-slate-950 p-3 shadow-2xl shadow-black/40"
        >
        <div className="mx-auto mb-4 h-2 w-14 rounded-full bg-white/25" />
        <div className="relative flex h-full flex-col overflow-hidden rounded-[2.15rem] bg-gradient-to-b from-primary-700 via-primary-800 to-primary-950 p-5 text-white">
          <div className="absolute -right-16 -top-12 size-48 rounded-full bg-primary-400/30 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-100">
              Moderated
            </span>
            <Smartphone className="size-5 text-primary-200" aria-hidden="true" />
          </div>
          <div className="relative my-auto text-center">
            <p className="text-xs font-semibold text-primary-200">Apple</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {featuredPhone.model}
            </p>
            <p className="mt-1 text-sm text-primary-100/70">{featuredPhone.year} · {featuredPhone.storage}</p>
            <div className="mx-auto mt-7 h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-[90%] rounded-full bg-accent-400" />
            </div>
            <p className="mt-2 text-xs font-semibold text-accent-300">
              {featuredPhone.batteryPercent}% battery health
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <BadgeCheck className="size-4 text-accent-400" aria-hidden="true" />
              Verified Seller
            </div>
          </div>
        </div>
        </motion.div>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 18, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute left-1 top-24 z-20 hidden w-40 rounded-2xl min-[361px]:block border border-white/60 bg-white/90 p-4 shadow-card-hover backdrop-blur-xl sm:left-4 sm:w-48"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-accent-700">
            <BatteryCharging className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted">Battery health</p>
            <p className="font-display text-lg font-bold text-ink">Excellent</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: -18, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        className="absolute bottom-20 right-1 z-20 hidden w-44 rounded-2xl min-[361px]:block border border-white/60 bg-white/90 p-4 shadow-card-hover backdrop-blur-xl sm:right-4 sm:w-52"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <Camera className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted">Photo review</p>
            <p className="font-display text-base font-bold text-ink">Listing checked</p>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-primary-100 backdrop-blur">
        <ShieldCheck className="size-4 text-accent-400" aria-hidden="true" />
        Reviewed before buyers see it
      </div>
    </div>
  )
}

export function LandingPage() {
  const reduceMotion = useReducedMotion()
  const { listings, isLoading, error } = useApprovedListings()
  const featuredListings = listings.slice(0, 8)
  const heroListing = listings.find((listing) => listing.model === 'iPhone 12') ?? listings[0] ?? {
    model: 'Verified Phone',
    year: 2020,
    storage: '128 GB',
    batteryPercent: 90,
  }

  return (
    <>
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

        <div className="relative mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-100 backdrop-blur"
            >
              <Sparkles className="size-3.5 text-accent-400" aria-hidden="true" />
              Moderated. Verified. Reused.
            </motion.div>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-7 break-words text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl"
            >
              Second-hand phones, without the second-guessing.
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-7 max-w-xl text-lg leading-body text-primary-100/85 sm:text-xl"
            >
              Discover phones from 2015–2024 with clear condition details,
              verified sellers, and moderation you can see.
            </motion.p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                to={AUTH_ROUTES.buyer}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-700 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950"
              >
                Browse Phones
                <ArrowRight className="size-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a
                href="#moderation"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-6 text-sm font-bold text-white transition duration-200 hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                How moderation works
              </a>
            </motion.div>

            <motion.dl
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26 }}
              className="mt-11 grid max-w-xl grid-cols-2 gap-3 border-t border-white/10 pt-7 min-[420px]:grid-cols-3"
            >
              {heroStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={index === 2 ? 'col-span-2 min-[420px]:col-span-1' : ''}
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-xl font-bold text-white sm:text-2xl">
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

          <HeroDevice featuredPhone={heroListing} />
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 min-[420px]:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: BadgeCheck, text: 'Verified seller signals' },
            { icon: BatteryCharging, text: 'Battery health on every card' },
            { icon: ClipboardCheck, text: 'Human-reviewed listings' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-2.5 text-sm font-semibold text-ink sm:justify-start">
              <span className="grid size-9 place-items-center rounded-xl bg-accent-50 text-accent-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {text}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-canvas py-18 sm:py-22 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
                Featured marketplace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Verified listings worth a closer look
              </h2>
              <p className="mt-4 text-base leading-body text-muted">
                Explore a curated mix of phones with the details buyers actually
                need—front and center.
              </p>
            </div>
            <Link
              to={AUTH_ROUTES.buyer}
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
            >
              View all phones
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          {error ? (
            <div className="mt-10 flex gap-3 rounded-card border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="font-bold">Featured listings could not be loaded.</p>
                <p className="mt-1">{error.message}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading featured listings">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                  <div className="aspect-[4/3] animate-pulse bg-primary-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-20 animate-pulse rounded bg-primary-100" />
                    <div className="h-6 w-3/4 animate-pulse rounded bg-primary-100" />
                    <div className="h-20 animate-pulse rounded-2xl bg-canvas" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredListings.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-card border border-dashed border-primary-200 bg-white px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-ink">No approved listings yet</h3>
              <p className="mt-2 text-sm text-muted">Moderated seller listings will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <section id="moderation" className="scroll-mt-24 bg-white py-18 sm:py-22 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Human moderation
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              How ReFon moderation works
            </h2>
            <p className="mt-4 text-base leading-body text-muted">
              Trust is not a vague promise. It is a visible process from submission
              to buyer inquiry.
            </p>
          </div>

          <div className="relative mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div
              className="absolute left-[12%] right-[12%] top-12 hidden border-t border-dashed border-primary-200 xl:block"
              aria-hidden="true"
            />
            {moderationSteps.map(({ number, icon: Icon, title, description }) => (
              <motion.div
                key={number}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                className="relative rounded-card border border-line bg-canvas p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="relative z-10 grid size-12 place-items-center rounded-2xl bg-primary-500 text-white shadow-card">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl font-bold text-primary-600/70">
                    {number}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-body text-muted">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas pb-18 sm:pb-22 lg:pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-card-xl bg-primary-950 px-6 py-10 text-white shadow-card sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:px-14">
            <div
              className="absolute -right-20 -top-28 size-80 rounded-full bg-primary-500/25 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-300">
                <Store className="size-4" aria-hidden="true" />
                Your next phone is waiting
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Browse with details you can trust.
              </h2>
              <p className="mt-3 leading-body text-primary-100/80">
                Compare models from 2015–2024, see battery health at a glance,
                and buy from verified sellers.
              </p>
            </div>
            <Link
              to={AUTH_ROUTES.buyer}
              className="group relative mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-700 px-6 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-accent-800 lg:mt-0"
            >
              <Search className="size-4" aria-hidden="true" />
              Start browsing
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
