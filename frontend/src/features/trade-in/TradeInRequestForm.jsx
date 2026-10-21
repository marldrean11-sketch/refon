import { useState } from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import { TextField } from '../../components/ui/TextField.jsx'
import { useAuth } from '../auth/useAuth.js'
import { createTradeInRequest } from './trade-in-api.js'

/**
 * "Send this to ReFon": turns a finished estimate into a request the team can
 * follow up on. Signed-in buyers get their name and number filled in.
 */
export function TradeInRequestForm({ answers, labels, estimate }) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [contact, setContact] = useState(user?.phone || user?.email || '')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSending(true)
    setErrors({})
    setMessage('')
    try {
      await createTradeInRequest({
        name,
        contact,
        brand: answers.brand,
        model: answers.model,
        answers: {
          storage: labels.storage,
          grade: labels.grade,
          battery: labels.battery,
          working: labels.working,
        },
        estimateLow: estimate.low,
        estimateHigh: estimate.high,
        ...(note.trim() ? { note } : {}),
      })
      setSent(true)
    } catch (requestError) {
      setErrors(requestError.errors ?? {})
      setMessage(requestError.message ?? 'Your request could not be sent.')
    } finally {
      setIsSending(false)
    }
  }

  if (sent) {
    return (
      <section className="rounded-card-lg border border-accent/50 bg-card p-5" data-testid="tradein-sent" role="status">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <CheckCircle2 className="size-5 text-accent" aria-hidden="true" />
          Sent to ReFon
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Salamat! We&rsquo;ll message you at <span className="font-semibold text-ink">{contact}</span> to set a
          time for the hands-on check. Bring the phone and its charger.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-card-lg border border-line bg-card p-5" data-testid="tradein-request">
      <h2 className="font-display text-lg font-bold text-ink">Want this offer?</h2>
      <p className="mt-1 text-sm text-muted">Send it to ReFon and we&rsquo;ll reach out to check the phone.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-3">
        <TextField
          id="tradein-name"
          label="Your name"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          disabled={isSending}
        />
        <TextField
          id="tradein-contact"
          label="Mobile or email"
          required
          autoComplete="tel"
          placeholder="09171234567"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          error={errors.contact}
          disabled={isSending}
        />
        <TextField
          id="tradein-note"
          label="Anything we should know"
          optional
          maxLength={1000}
          placeholder="Small crack on the back, box included…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={errors.note}
          disabled={isSending}
        />
        {message && (
          <p role="alert" className="text-sm text-danger">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSending}
          className="rf-bounce inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-page hover:bg-accent-hover disabled:opacity-60"
        >
          <Send className="size-4" aria-hidden="true" />
          {isSending ? 'Sending…' : 'Send to ReFon'}
        </button>
      </form>
    </section>
  )
}
