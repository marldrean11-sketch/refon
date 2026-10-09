import { useMemo } from 'react'
import { useApprovedListings } from '../features/listings/useApprovedListings.js'
import { HomeHero } from '../features/homepage/HomeHero.jsx'
import { TrustStripSection } from '../features/homepage/TrustStripSection.jsx'
import { FeaturedCategoriesSection } from '../features/homepage/FeaturedCategoriesSection.jsx'
import { NewArrivalsSection } from '../features/homepage/NewArrivalsSection.jsx'
import { WhyRefurbishedSection } from '../features/homepage/WhyRefurbishedSection.jsx'
import { GradingSection } from '../features/homepage/GradingSection.jsx'
import { InspectionSection } from '../features/homepage/InspectionSection.jsx'
import { HowItWorksSection } from '../features/homepage/HowItWorksSection.jsx'
import { VerifiedSellersSection } from '../features/homepage/VerifiedSellersSection.jsx'
import { TestimonialsSection } from '../features/homepage/TestimonialsSection.jsx'
import { WarrantySection } from '../features/homepage/WarrantySection.jsx'
import { FaqSection } from '../features/homepage/FaqSection.jsx'
import { FinalCtaSection } from '../features/homepage/FinalCtaSection.jsx'

/**
 * ReFon homepage.
 *
 * Section order follows the buyer's actual decision path:
 *   what is this → can I trust it → what can I get → what just arrived →
 *   what condition is it in → does it work → what if it breaks → how do I buy →
 *   who am I buying from → why refurbished at all → what do buyers worry about.
 *
 * Warranty sits straight after inspection because "what if it breaks?" is the
 * question that follows "does it work?", and it is asked before buying, not after
 * the FAQ. Why-refurbished sits late because it persuades visitors who have not
 * chosen refurbished yet; between the grid and the grading it interrupts the ones
 * who already have.
 *
 * Every product section reads live approved listings, so the homepage cannot show
 * a phone that is no longer buyable or a price that has moved.
 *
 * `FeaturedPhonesSection` and `BestValueSection` are not mounted. Phase 3A adds
 * `NewArrivalsSection` in their place — one live grid with tabs, rather than two
 * static grids saying the same thing — and Phase 3B reworks the sections below the
 * fold. The two components are untouched and still used by nothing else; they are
 * deleted in the Phase 7 cleanup rather than left as dead weight.
 */
export function LandingPage() {
  const { listings, isLoading } = useApprovedListings()

  /*
   * The phones the hero's first slide can put on its tag.
   *
   * `isFeatured` first, because the flag exists to say exactly this. When nothing
   * is flagged the hero falls back to the newest approved listings rather than
   * showing nothing, because an empty hero on a catalog with 28 phones is a worse
   * outcome than an unflagged one.
   */
  const featured = useMemo(() => {
    const flagged = listings.filter((listing) => listing.isFeatured)

    if (flagged.length > 0) {
      return flagged
    }

    return [...listings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  }, [listings])

  return (
    <>
      <HomeHero listings={listings} featured={featured} />
      <TrustStripSection />
      <FeaturedCategoriesSection />
      <NewArrivalsSection listings={listings} isLoading={isLoading} />
      <GradingSection />
      <InspectionSection />
      <WarrantySection />
      <HowItWorksSection />
      <VerifiedSellersSection listings={listings} isLoading={isLoading} />
      <WhyRefurbishedSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  )
}
