import { BadgeCheck, BatteryMedium, HardDrive, ImageIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { isImageReference } from './image-reference.js'
import { FavoriteButton } from '../favorites/FavoriteButton.jsx'
import { standardTransition } from '../../lib/motion.js'

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const artworkByBrand = {
  Apple: {
    surface: 'from-slate-200 via-zinc-100 to-slate-300',
    glow: 'bg-slate-400/35',
    device: 'from-zinc-700 to-slate-950',
    accent: 'bg-zinc-400',
  },
  Samsung: {
    surface: 'from-sky-100 via-blue-50 to-indigo-200',
    glow: 'bg-primary-400/30',
    device: 'from-primary-800 to-primary-950',
    accent: 'bg-accent-400',
  },
  Xiaomi: {
    surface: 'from-orange-100 via-amber-50 to-rose-200',
    glow: 'bg-orange-400/30',
    device: 'from-orange-800 to-stone-950',
    accent: 'bg-amber-400',
  },
  OPPO: {
    surface: 'from-emerald-100 via-teal-50 to-cyan-200',
    glow: 'bg-emerald-400/30',
    device: 'from-emerald-800 to-teal-950',
    accent: 'bg-accent-400',
  },
}

const viewPresentation = {
  default: {
    label: 'Photo preview',
    device: '-rotate-6 group-hover:-rotate-3',
  },
  front: {
    label: 'Front view',
    device: '-rotate-3 group-hover:rotate-0',
  },
  angle: {
    label: 'Angle view',
    device: 'rotate-6 group-hover:rotate-3',
  },
  screen: {
    label: 'Screen & battery',
    device: 'rotate-0 group-hover:-rotate-1',
  },
  detail: {
    label: 'Detail view',
    device: 'rotate-3 group-hover:rotate-0',
  },
}

function getBatteryTone(percentage) {
  if (percentage >= 85) {
    return {
      bar: 'bg-accent-500',
      text: 'text-accent-700',
    }
  }

  if (percentage >= 70) {
    return {
      bar: 'bg-warning',
      text: 'text-amber-700',
    }
  }

  return {
    bar: 'bg-danger',
    text: 'text-danger',
  }
}

export function PhoneArtwork({
  brand,
  model,
  color,
  view = 'default',
  className = 'aspect-[4/3]',
}) {
  const artwork = artworkByBrand[brand] ?? artworkByBrand.Samsung
  const presentation = viewPresentation[view] ?? viewPresentation.default
  const initials = brand === 'Samsung' ? 'S' : brand.charAt(0)

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${artwork.surface} ${className}`}
      role="img"
      aria-label={`${presentation.label} placeholder for ${brand} ${model} in ${color}`}
    >
      <div
        className={`absolute -right-10 -top-12 size-40 rounded-full blur-3xl ${artwork.glow}`}
        aria-hidden="true"
      />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#64748b_0.7px,transparent_0.7px)] [background-size:14px_14px]" aria-hidden="true" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted shadow-sm backdrop-blur">
        <ImageIcon className="size-3" aria-hidden="true" />
        {presentation.label}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={`relative h-[76%] w-[39%] min-w-28 rounded-[1.7rem] border-[5px] border-slate-900/90 bg-gradient-to-b ${artwork.device} p-3 shadow-2xl transition duration-300 motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-105 ${presentation.device}`}
          aria-hidden="true"
        >
          <div className="mx-auto mb-3 h-1.5 w-9 rounded-full bg-white/35" />
          <div className="grid h-full place-items-center rounded-[1.15rem] bg-gradient-to-br from-white/20 to-black/30 text-white shadow-inner">
            {view === 'screen' ? (
              <div className="w-4/5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Battery
                </p>
                <p className="mt-1 font-display text-2xl font-bold">94%</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[94%] rounded-full bg-accent-400" />
                </div>
              </div>
            ) : view === 'detail' ? (
              <div className="w-4/5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Storage
                </p>
                <p className="mt-1 font-display text-lg font-bold">256 GB</p>
                <div className="mx-auto mt-3 flex h-8 w-16 items-end justify-center gap-1">
                  {[35, 60, 85, 100].map((height) => (
                    <span
                      key={height}
                      className={`w-2 rounded-t ${artwork.accent}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="font-display text-4xl font-bold tracking-tight opacity-90">
                {initials}
              </span>
            )}
          </div>
          <div className={`absolute -right-1 top-9 h-12 w-1 rounded-l ${artwork.accent}`} />
        </div>
      </div>
      <span className="absolute bottom-4 right-4 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-muted shadow-sm backdrop-blur">
        {color}
      </span>
    </div>
  )
}

export function ListingCard({ listing, preview = false, hideSaveButton = false }) {
  const reduceMotion = useReducedMotion()
  const batteryTone = getBatteryTone(listing.batteryPercent)
  const mainPhoto = listing.mainPhoto ?? listing.photos?.[0]

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={reduceMotion || preview ? undefined : { y: -6 }}
      whileTap={reduceMotion || preview ? undefined : { scale: 0.99 }}
      transition={standardTransition}
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition duration-300 hover:border-primary-100 hover:shadow-card-hover"
    >
      {!preview && (
        <Link
          to={`/listings/${listing.id}`}
          className="absolute inset-0 z-30 rounded-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 focus-visible:ring-inset"
          aria-label={`View ${listing.year} ${listing.brand} ${listing.model}`}
        >
          <span className="sr-only">View listing details</span>
        </Link>
      )}
      <div className="relative overflow-hidden">
        {isImageReference(mainPhoto) ? (
          <img
            src={mainPhoto}
            alt={`${listing.brand} ${listing.model}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover transition duration-500 ease-smooth motion-reduce:transform-none group-hover:scale-[1.03]"
          />
        ) : (
          <PhoneArtwork
            brand={listing.brand}
            model={listing.model}
            color={listing.color}
          />
        )}
        <div className="absolute left-4 top-12 inline-flex items-center gap-1.5 rounded-full bg-accent-700 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-emerald-950/15">
          <BadgeCheck className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          Verified Seller
        </div>
        <span className="absolute right-4 top-12 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
          {listing.condition}
        </span>
        {/* Owns the stacking context so it paints above the z-30 full-card link. */}
        {!preview && !hideSaveButton && (
          <div className="absolute right-3 top-3 z-40">
            <FavoriteButton listing={listing} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
              {listing.brand}
            </p>
            <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink">
              {listing.model}
            </h3>
            <p className="mt-1 text-sm text-muted">{listing.year} model</p>
          </div>
          <p className="shrink-0 font-display text-xl font-bold tracking-tight text-ink">
            {Number(listing.price) > 0
              ? currencyFormatter.format(listing.price)
              : '₱—'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-canvas p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <BatteryMedium className="size-4" aria-hidden="true" />
                Battery
              </span>
              <span className={batteryTone.text}>{listing.batteryPercent}%</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Battery health"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={listing.batteryPercent}
            >
              <div
                className={`h-full rounded-full ${batteryTone.bar}`}
                style={{ width: `${listing.batteryPercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-canvas p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <HardDrive className="size-4" aria-hidden="true" />
              Storage
            </div>
            <p className="mt-2 font-display text-base font-semibold text-ink">
              {listing.storage}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span className="truncate">Sold by {listing.sellerName}</span>
          <span className="shrink-0 font-semibold text-primary-700">Condition checked</span>
        </div>
      </div>
    </motion.article>
  )
}
