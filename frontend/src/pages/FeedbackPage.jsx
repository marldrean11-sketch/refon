import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Confetti } from '../components/ui/Confetti.jsx'
import { LoopSpinner } from '../components/ui/LoopSpinner.jsx'
import { FloatingLoops } from '../components/brand/FloatingLoops.jsx'
import { Container } from '../features/design/Container.jsx'
import { submitFeedbackRequest } from '../features/feedback/feedback-api.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

const WOULD_BUY = [
  { id: 'YES', label: 'Oo, bibili ako', hint: 'Yes' },
  { id: 'MAYBE', label: 'Siguro', hint: 'Maybe' },
  { id: 'NO', label: 'Hindi muna', hint: 'Not yet' },
]

const STAR_WORDS = ['', 'Needs work', 'Okay', 'Good', 'Great', 'Panalo!']

/**
 * Three-question booth feedback: a star rating, whether they would buy a
 * pre-loved phone from ReFon, and an optional comment. Anonymous, with no
 * account and no contact details; results appear in the admin dashboard.
 */
export function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [wouldBuy, setWouldBuy] = useState(null)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle')
  const thanksRef = useRef(null)

  // The form is taller than the thank-you panel, so bring the panel into view.
  useEffect(() => {
    if (status === 'sent') thanksRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [status])
  const [error, setError] = useState('')

  const shown = hover || rating

  async function onSubmit(event) {
    event.preventDefault()
    if (!rating || !wouldBuy) {
      setError('Pick a star rating and answer the second question.')
      return
    }
    setStatus('sending')
    setError('')
    try {
      await submitFeedbackRequest({ rating, wouldBuy, comment: comment.trim() })
      setStatus('sent')
    } catch (requestError) {
      setStatus('idle')
      setError(requestError.message ?? 'Could not send your feedback. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="relative overflow-hidden border-b border-line">
        <FloatingLoops density="light" />
        <Container className="relative py-10 sm:py-14">
          <Breadcrumb items={[{ label: 'Home', to: MARKETPLACE_ROUTES.home }, { label: 'Feedback' }]} />
          <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Rate ReFon</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
            Kumusta ang ReFon?
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted">Three quick questions. Anonymous, no sign-in, 20 seconds.</p>
        </Container>
      </div>

      <Container className="py-10">
        {status === 'sent' ? (
          <div ref={thanksRef} data-testid="feedback-thanks" className="relative mx-auto max-w-xl rounded-[28px] bg-accent p-8 text-center text-page">
            <Confetti active burstKey="thanks" />
            <p className="font-display text-3xl font-extrabold">Salamat!</p>
            <p className="mt-2 text-page/80">Your feedback helps the BSCS 4B team make ReFon better.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to={MARKETPLACE_ROUTES.healthCheck} className="rf-bounce inline-flex min-h-11 items-center rounded-full bg-page px-5 text-sm font-semibold text-accent">
                Check your phone
              </Link>
              <Link to={MARKETPLACE_ROUTES.shop} className="rf-bounce inline-flex min-h-11 items-center rounded-full border border-page/30 px-5 text-sm font-semibold text-page">
                Browse phones
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate data-testid="feedback-form" className="mx-auto flex max-w-xl flex-col gap-6">
            <fieldset className="rf-spotlight rounded-card-lg border border-line bg-card p-6">
              <legend className="sr-only">How would you rate ReFon?</legend>
              <p className="font-display text-lg font-bold text-ink">How would you rate ReFon?</p>
              <div className="mt-4 flex items-center gap-2" onPointerLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="cursor-pointer" onPointerEnter={() => setHover(value)}>
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="peer sr-only"
                    />
                    <span className="sr-only">{value} {value === 1 ? 'star' : 'stars'}</span>
                    <Star
                      aria-hidden="true"
                      className={`size-10 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
                        value <= shown ? 'scale-110 fill-accent text-accent' : 'text-line-2'
                      }`}
                    />
                  </label>
                ))}
                <span className="ml-2 font-mono text-sm text-accent" aria-live="polite">
                  {STAR_WORDS[shown]}
                </span>
              </div>
            </fieldset>

            <fieldset className="rf-spotlight rounded-card-lg border border-line bg-card p-6">
              <legend className="sr-only">Would you buy a pre-loved phone from ReFon?</legend>
              <p className="font-display text-lg font-bold text-ink">Would you buy a pre-loved phone from ReFon?</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {WOULD_BUY.map((option) => (
                  <label key={option.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="wouldBuy"
                      value={option.id}
                      checked={wouldBuy === option.id}
                      onChange={() => setWouldBuy(option.id)}
                      className="peer sr-only"
                    />
                    <span className="rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full border border-line-2 bg-well px-4 text-[15px] text-ink peer-checked:border-chalk peer-checked:bg-chalk peer-checked:text-page peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      {option.label}
                      <span className="text-[12px] opacity-60">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="rf-spotlight rounded-card-lg border border-line bg-card p-6">
              <label htmlFor="feedback-comment" className="font-display text-lg font-bold text-ink">
                What should we improve? <span className="text-sm font-normal text-subtle">(optional)</span>
              </label>
              <textarea
                id="feedback-comment"
                rows={4}
                maxLength={500}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Sabihin mo lang…"
                className="mt-4 w-full rounded-2xl border border-line-2 bg-well p-4 text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="mt-1 text-right font-mono text-[11px] text-subtle">{comment.length}/500</p>
            </div>

            {error && (
              <p role="alert" className="rounded-2xl border border-danger/50 bg-red-50 p-4 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="rf-bounce inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-page hover:bg-accent-hover disabled:opacity-60"
            >
              {status === 'sending' && <LoopSpinner className="size-5" />}
              {status === 'sending' ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
        )}
      </Container>
    </div>
  )
}
