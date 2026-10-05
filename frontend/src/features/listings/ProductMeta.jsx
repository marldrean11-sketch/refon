import { useEffect } from 'react'
import { setPageMeta } from '../../components/layout/RouteEffects.jsx'
import { formatPeso } from '../../lib/format.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Per-product document metadata.
 *
 * A product page cannot be described by its path, so it publishes its own title,
 * description, canonical URL, social image, and `Product` structured data derived
 * from the listing that is actually on screen. Every field comes from the API
 * response — nothing here is templated with invented prices, ratings, or stock.
 *
 * Ratings are only emitted when the listing genuinely has published reviews,
 * because `aggregateRating` with a fabricated or zero value is the kind of
 * structured data that gets a domain penalised.
 *
 * The component renders nothing: it exists purely to hand real metadata to the
 * single place that owns the document head.
 */
export function ProductMeta({ listing, canonicalPath }) {
  useEffect(() => {
    if (!listing) {
      return undefined
    }

    const title = `${listing.brand} ${listing.model} ${listing.storage} · Grade ${listing.grade} · ${formatPeso(
      listing.price,
    )} | ReFon`

    const gradeLabel = listing.gradeLabel ?? listing.grade

    const description = [
      `${listing.year} ${listing.brand} ${listing.model} (${listing.storage}${
        listing.ram ? `, ${listing.ram} RAM` : ''
      }).`,
      `Grade ${listing.grade} — ${gradeLabel}.`,
      `Battery health ${listing.batteryPercent}%.`,
      listing.inspectionRecorded
        ? `${listing.inspectionTotal}-point inspection recorded.`
        : 'Inspection results not recorded.',
      listing.savings
        ? `${formatPeso(listing.price)}, saving ${formatPeso(listing.savings)} against ${formatPeso(
            listing.originalPrice,
          )}.`
        : `${formatPeso(listing.price)}.`,
      listing.warrantyMonths > 0
        ? `${listing.warrantyMonths}-month warranty.`
        : 'Sold as-is, no warranty.',
      listing.seller?.verificationStatus === 'APPROVED'
        ? `Verified seller: ${listing.sellerName}.`
        : `Sold by ${listing.sellerName}.`,
    ].join(' ')

    const canonical = canonicalPath ?? `${MARKETPLACE_ROUTES.shop}/${listing.slug ?? listing.id}`
    const url = `https://refon.ph${canonical}`

    // A real photo is a better social card than artwork. Illustration-only
    // listings get no og:image rather than an inaccurate one.
    const image = listing.mainPhoto ?? null

    setPageMeta({
      pathname: window.location.pathname,
      title,
      description: description.slice(0, 300),
      canonical,
      image,
      jsonLd: buildProductJsonLd({ listing, canonical: url, image, gradeLabel }),
    })

    return () => setPageMeta(null)
  }, [listing, canonicalPath])

  return null
}

/**
 * `Product` schema.
 *
 * Deliberately conservative. Availability reflects the real listing status, and
 * `aggregateRating` is omitted entirely when there are no published reviews
 * rather than being reported as zero.
 */
function buildProductJsonLd({ listing, canonical, image, gradeLabel }) {
  const sellerVerified = listing.seller?.verificationStatus === 'APPROVED'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${listing.brand} ${listing.model}`,
    description: listing.conditionNotes,
    sku: listing.id,
    category: 'Refurbished smartphone',
    brand: { '@type': 'Brand', name: listing.brand },
    color: listing.color && listing.color !== 'As pictured' ? listing.color : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Model year', value: String(listing.year) },
      { '@type': 'PropertyValue', name: 'Storage', value: listing.storage },
      listing.ram
        ? { '@type': 'PropertyValue', name: 'RAM', value: listing.ram }
        : undefined,
      { '@type': 'PropertyValue', name: 'Condition grade', value: `Grade ${listing.grade}` },
      { '@type': 'PropertyValue', name: 'Condition label', value: gradeLabel },
      { '@type': 'PropertyValue', name: 'Battery health', value: `${listing.batteryPercent}%` },
      {
        '@type': 'PropertyValue',
        name: 'Warranty',
        value: listing.warrantyMonths > 0 ? `${listing.warrantyMonths} months` : 'None (sold as-is)',
      },
      {
        '@type': 'PropertyValue',
        name: 'Inspection',
        value: listing.inspectionRecorded
          ? `${listing.inspectionChecks.length} of ${listing.inspectionTotal} checks recorded`
          : 'Not recorded',
      },
    ].filter(Boolean),
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'PHP',
      price: Number(listing.price).toFixed(2),
      availability:
        listing.status === 'SOLD'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: {
        '@type': 'Organization',
        name: listing.sellerName,
        ...(sellerVerified ? { description: 'Verified ReFon marketplace seller' } : {}),
      },
    },
  }

  if (image) {
    jsonLd.image = image.startsWith('http') ? image : `https://refon.ph${image}`
  }

  if (listing.ratingAverage && listing.ratingCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(listing.ratingAverage).toFixed(1),
      reviewCount: listing.ratingCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return jsonLd
}