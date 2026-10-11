import { useEffect, useState } from 'react'
import { MessageSquareHeart, Star } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { getFeedbackSummaryRequest } from './feedback-api.js'

const WOULD_BUY = [
  { id: 'YES', label: 'Oo, bibili ako', bar: 'bg-accent' },
  { id: 'MAYBE', label: 'Siguro', bar: 'bg-[#ffd23f]' },
  { id: 'NO', label: 'Hindi muna', bar: 'bg-line-2' },
]

const timeFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * Booth feedback results for the admin dashboard: how many visitors rated
 * ReFon, the average star rating, the would-buy split and the latest comments.
 * Loads on its own so a slow or failed request never holds up the queues.
 */
export function FeedbackSummaryPanel() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getFeedbackSummaryRequest(controller.signal)
      .then((data) => setSummary(data.feedback))
      .catch((caught) => {
        // The API client reports an aborted request as a network error.
        if (!controller.signal.aborted) setError(caught)
      })
    return () => controller.abort()
  }, [])

  return (
    <Panel className="mt-6" data-testid="admin-feedback">
      <PanelHeader
        kicker="Techno Fair booth"
        title="Booth feedback"
        description="What visitors said on the Rate ReFon form (/feedback)."
      />
      <div className="p-5 sm:p-6">
        {error ? (
          <p className="text-sm text-muted" role="alert">
            Feedback results could not load: {error.message}
          </p>
        ) : !summary ? (
          <div role="status" aria-label="Loading booth feedback">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : summary.total === 0 ? (
          <p className="flex items-center gap-2.5 text-sm text-muted">
            <MessageSquareHeart className="size-4 text-accent" aria-hidden="true" />
            No ratings yet. Put the &ldquo;Rate us&rdquo; QR on the booth table.
          </p>
        ) : (
          <FeedbackResults summary={summary} />
        )}
      </div>
    </Panel>
  )
}

function FeedbackResults({ summary }) {
  const { total, averageRating, wouldBuy, latest } = summary
  const comments = latest.filter((entry) => entry.comment)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Responses
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{total}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Average rating
            </p>
            <p className="mt-1 flex items-center gap-2 font-display text-3xl font-bold text-ink">
              {averageRating?.toFixed(1) ?? '–'}
              <Star className="size-6 fill-accent text-accent" aria-hidden="true" />
              <span className="sr-only">out of 5</span>
            </p>
          </div>
        </div>

        <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Would buy a refurbished phone from ReFon?
        </p>
        <ul className="mt-3 space-y-3">
          {WOULD_BUY.map((option) => {
            const count = wouldBuy[option.id] ?? 0
            const share = total ? count / total : 0
            return (
              <li key={option.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink">{option.label}</span>
                  <span className="font-mono text-muted">
                    {count} · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-well">
                  <div
                    className={`h-full origin-left rounded-pill ${option.bar}`}
                    style={{ transform: `scaleX(${share})` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Latest comments
        </p>
        {comments.length ? (
          <ul className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {comments.map((entry) => (
              <li key={entry.id} className="rounded-control border border-line bg-well px-4 py-3">
                <p className="text-sm leading-body text-ink">&ldquo;{entry.comment}&rdquo;</p>
                <p className="mt-1.5 font-mono text-[11px] text-subtle">
                  {'★'.repeat(entry.rating)} · {timeFormatter.format(new Date(entry.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No written comments yet.</p>
        )}
      </div>
    </div>
  )
}
