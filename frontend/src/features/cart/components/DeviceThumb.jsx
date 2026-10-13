import { ListingPhoto } from '../../listings/ListingPhoto.jsx'

/**
 * A small, honest device thumbnail for order summaries.
 *
 * `PhoneArtwork` draws a whole device at a fixed minimum width, which is right on a
 * product card or a cart line and wrong in an 80px order-review row — there the
 * device is clipped to a sliver and the row looks like a rendering failure.
 *
 * When a listing has a real photograph that is what is shown. When it does not, this
 * renders a brand-tinted tile with the brand's initial rather than a fake photograph
 * or an unreadable illustration. Absence of a photo stays visibly absent instead of
 * being papered over.
 */
const BRAND_INITIALS = { samsung: 'S', xiaomi: 'X', oppo: 'O', vivo: 'V' }

export function DeviceThumb({ listing, className = '', size = 'md' }) {
  const photo = listing?.mainPhoto ?? listing?.photos?.[0]
  const alt = `${listing?.brand} ${listing?.model}`

  const box =
    size === 'sm' ? 'size-14 rounded-lg' : 'w-20 rounded-xl sm:w-24'

  const brand = String(listing?.brand ?? '')
  const initial = BRAND_INITIALS[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() ?? 'R'

  const tile = (
    <div
      className={`${box} grid shrink-0 place-items-center overflow-hidden bg-canvas ring-1 ring-inset ring-line ${className}`}
      role="img"
      aria-label={`${alt} — no photograph available`}
    >
      <span className="font-display text-lg font-bold tracking-tight text-subtle">
        {initial}
      </span>
    </div>
  )

  return (
    <ListingPhoto
      src={photo}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={320}
      height={240}
      className={`${box} aspect-[4/3] shrink-0 object-cover ${className}`}
      fallback={tile}
    />
  )
}
