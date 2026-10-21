import { useState } from 'react'
import { AlertCircle, Send } from 'lucide-react'
import { formatRelativeTime } from '../../lib/format.js'

const MAX_REPLY = 2000

/**
 * The replies under an inquiry, and a box to add one.
 *
 * `viewer` is 'seller' or 'buyer': it decides which side of the thread is
 * "you". `onSend(body)` posts the reply and resolves once it is saved; the
 * caller swaps in the updated inquiry, so the new message appears from the
 * server's copy rather than a guess. Without `onSend` the thread is read-only.
 */
export function InquiryThread({ replies = [], viewer, onSend, disabledReason }) {
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !onSend) return

    setIsSending(true)
    setError('')
    try {
      await onSend(body)
      setDraft('')
    } catch (requestError) {
      setError(requestError?.message ?? 'Your reply could not be sent.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {replies.length > 0 && (
        <ol className="mb-4 space-y-2.5" aria-label="Replies">
          {replies.map((reply) => {
            const mine = (viewer === 'seller') === reply.fromSeller
            return (
              <li key={reply.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    mine ? 'bg-accent text-page' : 'bg-surface-2 text-ink ring-1 ring-inset ring-line'
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${mine ? 'text-page/70' : 'text-muted'}`}>
                    {mine ? 'You' : reply.fromSeller ? 'Seller' : 'Buyer'} ·{' '}
                    {formatRelativeTime(reply.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line break-words">{reply.body}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {onSend ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Write a reply</span>
            <textarea
              rows={2}
              value={draft}
              maxLength={MAX_REPLY}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={viewer === 'seller' ? 'Reply to the buyer…' : 'Reply to the seller…'}
              className="w-full resize-none rounded-control border border-line-2 bg-surface-2 p-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-bold text-page transition hover:bg-accent-hover disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden="true" />
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </form>
      ) : (
        disabledReason && <p className="text-xs text-muted">{disabledReason}</p>
      )}

      {error && (
        <p role="alert" className="mt-2 flex gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
