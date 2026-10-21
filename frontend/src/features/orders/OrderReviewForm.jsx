import { useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'
import { createOrderReviewRequest } from './order-api.js'

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/** Five tappable stars. `value` 0 means not chosen yet. */
function StarInput({ label, value, onChange, required = false }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">
        {label}
        {!required && <span className="font-normal text-muted"> (optional)</span>}
      </legend>
      <div className="mt-1 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            onClick={() => onChange(stars === value && !required ? 0 : stars)}
            aria-label={`${stars} star${stars === 1 ? '' : 's'} – ${LABELS[stars - 1]}`}
            aria-pressed={value === stars}
            className="rounded p-0.5 text-subtle transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Star
              className={`size-6 ${stars <= value ? 'fill-[#ffd23f] text-[#ffd23f]' : ''}`}
              aria-hidden="true"
            />
          </button>
        ))}
        {value > 0 && <span className="ml-2 text-xs text-muted">{LABELS[value - 1]}</span>}
      </div>
    </fieldset>
  )
}

/**
 * Review one phone from a completed order. Overall rating and a comment are
 * required; how well the condition matched the listing, and the seller, are
 * optional (the seller score feeds the seller's public rating).
 */
export function OrderReviewForm({ orderNumber, item, onReviewed }) {
  const [rating, setRating] = useState(0)
  const [conditionRating, setConditionRating] = useState(0)
  const [sellerRating, setSellerRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (item.reviewed) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        You reviewed this phone. Thank you!
      </p>
    )
  }

  if (!item.listingId) {
    return null
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-semibold text-page transition hover:bg-accent-hover"
      >
        <Star className="size-4" aria-hidden="true" />
        Write a review
      </button>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!rating) {
      setError('Choose an overall rating.')
      return
    }
    if (comment.trim().length < 10) {
      setError('Write at least 10 characters about the phone.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await createOrderReviewRequest(orderNumber, {
        listingId: item.listingId,
        rating,
        ...(conditionRating ? { conditionRating } : {}),
        ...(sellerRating ? { sellerRating } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
        comment: comment.trim(),
      })
      onReviewed(item.listingId)
    } catch (requestError) {
      setError(requestError.message ?? 'Your review could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-4 rounded-control border border-line bg-surface-2 p-4">
      <StarInput label="Overall" value={rating} onChange={setRating} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <StarInput label="Condition as described" value={conditionRating} onChange={setConditionRating} />
        <StarInput label="Seller" value={sellerRating} onChange={setSellerRating} />
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-ink">
          Title <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Exactly as described"
          className="mt-1 h-10 w-full rounded-control border border-line-2 bg-surface px-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Your review</span>
        <textarea
          rows={4}
          value={comment}
          maxLength={2000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="How is the phone? Battery, screen, condition, delivery…"
          className="mt-1 w-full resize-none rounded-control border border-line-2 bg-surface p-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-page transition hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? 'Posting…' : 'Post review'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="inline-flex h-10 items-center rounded-control px-4 text-sm font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-muted">
        Your review is public on the phone's page and the seller's store, marked as a verified
        purchase, with your name shortened.
      </p>
    </form>
  )
}
