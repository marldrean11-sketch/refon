import { useMemo } from 'react'
import { useApprovedListings } from '../features/listings/useApprovedListings.js'
import { HeroSection } from '../features/homepage/HeroSection.jsx'
import { TrustStripSection } from '../features/homepage/TrustStripSection.jsx'
import { FeaturedCategoriesSection } from '../features/homepage/FeaturedCategoriesSection.jsx'
import {
  BestValueSection,
  FeaturedPhonesSection,
} from '../features/homepage/PhoneGridSection.jsx'
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
 *   what is this → can I trust it → what can I get → why is it cheaper →
 *   how do I know it's not broken → how do I buy → who else has bought one.
 *
 * Every product section reads live approved listings, so the homepage cannot
 * show a phone that is no longer buyable or a price that has moved.
 */
export function LandingPage() {
  const { listings, isLoading, error, retry } = useApprovedListings()

  // The hero and seller sections both need one representative listing, so the
  // pick is computed once rather than per component.
  const heroListing = useMemo(() => {
    if (listings.length === 0) {
      return null
    }

    return (
      listings.find((listing) => listing.brand === 'Apple' && /iPhone 1[23]/i.test(listing.model)) ??
      listings[0]
    )
  }, [listings])

  return (
    <>
      <HeroSection featured={heroListing} />
      <TrustStripSection />
      <FeaturedCategoriesSection />
      <FeaturedPhonesSection
        listings={listings}
        isLoading={isLoading}
        error={error}
        onRetry={retry}
      />
      <WhyRefurbishedSection />
      <GradingSection />
      <BestValueSection
        listings={listings}
        isLoading={isLoading}
        error={error}
        onRetry={retry}
      />
      <InspectionSection />
      <HowItWorksSection />
      <VerifiedSellersSection listings={listings} isLoading={isLoading} />
      <TestimonialsSection />
      <WarrantySection />
      <FaqSection />
      <FinalCtaSection />
    </>
  )
}
