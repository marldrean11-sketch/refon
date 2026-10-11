import { useEffect, useRef, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal.jsx'
import { LoopSpinner } from '../../../components/ui/LoopSpinner.jsx'

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

/**
 * Lower the price of a live listing. Only a lower price is accepted, so it goes
 * live straight away without another review, and buyers who saved the phone get
 * a price-drop alert in their notifications.
 */
export function LowerPriceDialog({ listing, onClose, onSubmit }) {
  const inputRef = useRef(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const current = listing ? Number(listing.price) : 0

  useEffect(() => {
    if (!listing) return
    const id = requestAnimationFrame(() => {
      setValue('')
      setError('')
    })
    return () => cancelAnimationFrame(id)
  }, [listing])

  const next = Number(value)
  const saving = value && next > 0 && next < current ? current - next : 0

  async function handleSubmit(event) {
    event.preventDefault()
    if (!(next > 0)) return setError('Enter the new price in pesos.')
    if (next >= current) return setError(`The new price must be lower than ${peso.format(current)}.`)
    setIsSaving(true)
    setError('')
    try {
      await onSubmit(listing, next)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={Boolean(listing)}
      onClose={onClose}
      title="Lower the price"
      description={listing ? `${listing.brand} ${listing.model} · now ${peso.format(current)}` : ''}
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} noValidate data-testid="lower-price-form">
        <label htmlFor="lower-price" className="text-sm font-semibold text-ink">
          New price (₱)
        </label>
        <input
          ref={inputRef}
          id="lower-price"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby="lower-price-help"
          className="mt-2 block min-h-11 w-full rounded-control border border-line-2 bg-well px-3 font-mono text-lg text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <p id="lower-price-help" className="mt-2 text-sm leading-body text-muted">
          {saving
            ? `${peso.format(saving)} less. `
            : ''}
          It goes live right away, and buyers who saved this phone get a price-drop alert.
        </p>
        {error && (
          <p className="mt-2 text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-line-2 px-5 text-sm font-semibold text-ink hover:border-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-page hover:bg-accent-hover disabled:opacity-60"
          >
            {isSaving ? <LoopSpinner className="size-4" /> : <TrendingDown className="size-4" aria-hidden="true" />}
            Lower price
          </button>
        </div>
      </form>
    </Modal>
  )
}
