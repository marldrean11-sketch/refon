import { Share2 } from 'lucide-react'
import { useToast } from '../../components/ui/Toast.jsx'
import { SITE_INFO } from '../../content/site-info.js'
import { formatPeso } from '../../lib/format.js'
import { productPath } from '../../lib/routes.js'

/** Opens the phone's share sheet for this listing, or copies its link. */
export function ShareListingButton({ listing, className = '' }) {
  const toast = useToast()

  async function handleShare() {
    const url = `${SITE_INFO.url}${productPath(listing)}`
    const text = `${listing.brand} ${listing.model} ${listing.storage} for ${formatPeso(listing.price)} on ReFon`
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied', { description: 'Paste it in a chat to share this phone.' })
    } catch {
      toast.error("Couldn't copy the link")
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this phone"
      data-testid="share-listing"
      className={`rf-bounce grid size-11 shrink-0 place-items-center rounded-full border border-line-2 text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <Share2 className="size-[18px]" aria-hidden="true" />
    </button>
  )
}
