import { useEffect, useRef, useState } from 'react'
import { ImagePlus, QrCode, Wallet, X } from 'lucide-react'
import { TextField } from '../../../components/ui/TextField.jsx'
import { Panel } from '../../design/Surfaces.jsx'
import { uploadPhotosRequest } from '../../listings/listing-api.js'
import { updatePaymentDetailsRequest } from '../seller-api.js'

const EMPTY = { gcash: '', maya: '', bank: '', qr: '', note: '' }

function fromSeller(seller) {
  const details = seller?.paymentDetails ?? {}
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, details[key] ?? '']))
}

/**
 * Where buyers send money for GCash, Maya and bank orders.
 *
 * Shown to a buyer only after the seller confirms their order, so the seller
 * never has to paste account numbers into chat. Cash on delivery needs none.
 */
export function PaymentDetailsCard({ seller, onSaved }) {
  const [values, setValues] = useState(() => fromSeller(seller))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef(null)
  const dirtyRef = useRef(false)

  // The profile refreshes in the background; keep the form in step with it
  // until the seller starts typing.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    if (!dirtyRef.current) setValues(fromSeller(seller))
  }, [seller])

  function change(field, value) {
    dirtyRef.current = true
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  async function handleQr(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsUploading(true)
    setErrors((current) => ({ ...current, qr: undefined }))
    try {
      const response = await uploadPhotosRequest([file])
      const url = response.urls?.[0] ?? response.files?.[0]?.url
      if (!url) throw new Error('The QR code could not be uploaded.')
      change('qr', url)
    } catch (requestError) {
      setErrors((current) => ({ ...current, qr: requestError.message ?? 'The QR code could not be uploaded.' }))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setErrors({})
    try {
      const response = await updatePaymentDetailsRequest({
        ...values,
        gcash: values.gcash.replace(/[\s()-]/g, ''),
        maya: values.maya.replace(/[\s()-]/g, ''),
      })
      dirtyRef.current = false
      if (response.seller) setValues(fromSeller(response.seller))
      setMessage('Saved. Buyers see these after you confirm their order.')
      onSaved?.()
    } catch (requestError) {
      setErrors(requestError.errors ?? {})
      setMessage(requestError.message ?? 'Your payment details could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Panel className="p-5 sm:p-6" data-testid="payment-details">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Payment details</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            For GCash, Maya and bank orders. A buyer sees these only after you confirm their
            order. Cash on delivery needs nothing here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          id="pay-gcash"
          label="GCash number"
          optional
          inputMode="tel"
          placeholder="09171234567"
          value={values.gcash}
          onChange={(event) => change('gcash', event.target.value)}
          error={errors.gcash}
          disabled={isSaving}
        />
        <TextField
          id="pay-maya"
          label="Maya number"
          optional
          inputMode="tel"
          placeholder="09171234567"
          value={values.maya}
          onChange={(event) => change('maya', event.target.value)}
          error={errors.maya}
          disabled={isSaving}
        />
        <TextField
          id="pay-bank"
          className="sm:col-span-2"
          label="Bank account"
          optional
          placeholder="BPI · Juan Dela Cruz · 1234 5678 90"
          maxLength={300}
          value={values.bank}
          onChange={(event) => change('bank', event.target.value)}
          error={errors.bank}
          disabled={isSaving}
        />
        <TextField
          id="pay-note"
          className="sm:col-span-2"
          label="Note to buyers"
          optional
          placeholder="Send a screenshot of your receipt in the order chat."
          maxLength={300}
          value={values.note}
          onChange={(event) => change('note', event.target.value)}
          error={errors.note}
          disabled={isSaving}
        />

        <div className="sm:col-span-2">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
            Payment QR code
            <span className="ml-1.5 font-normal normal-case tracking-normal text-subtle">optional</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {values.qr ? (
              <div className="relative">
                <img
                  src={values.qr}
                  alt="Your payment QR code"
                  className="size-28 rounded-xl border border-line object-contain bg-white"
                />
                <button
                  type="button"
                  onClick={() => change('qr', '')}
                  aria-label="Remove QR code"
                  className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-line-2 bg-card text-muted hover:text-danger"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <span className="grid size-28 place-items-center rounded-xl border border-dashed border-line-2 text-subtle">
                <QrCode className="size-8" aria-hidden="true" />
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading || isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {isUploading ? 'Uploading…' : values.qr ? 'Replace QR' : 'Upload QR'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              onChange={handleQr}
            />
          </div>
          {errors.qr && <p className="mt-2 text-sm text-danger">{errors.qr}</p>}
        </div>

        {message && (
          <p role="status" className="text-sm text-muted sm:col-span-2">
            {message}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-page shadow-card transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save payment details'}
          </button>
        </div>
      </form>
    </Panel>
  )
}
