import { useState } from 'react'
import { MapPin, Phone } from 'lucide-react'
import { TextField } from '../../components/ui/TextField.jsx'
import { AddressForm } from '../checkout/components/CheckoutForms.jsx'
import { useAuth } from '../auth/useAuth.js'
import { updateProfileRequest } from './account-api.js'

const EMPTY_ADDRESS = {
  region: '',
  province: '',
  city: '',
  barangay: '',
  street: '',
  postalCode: '',
  deliveryNotes: '',
}

/**
 * Mobile number and default delivery address. Both prefill checkout, so a
 * returning buyer does not type them again. Uses the checkout's own address
 * fields, so what is saved here is exactly what checkout expects.
 */
export function DeliveryDetailsCard() {
  const { user, updateUser } = useAuth()
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(() => ({ ...EMPTY_ADDRESS, ...(user?.defaultAddress ?? {}) }))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function changeAddress(field, value) {
    setAddress((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, [`defaultAddress.${field}`]: undefined }))
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setErrors({})
    try {
      const response = await updateProfileRequest({
        phone: phone.replace(/[\s()-]/g, ''),
        defaultAddress: address,
      })
      updateUser(response.user)
      setMessage('Saved. Checkout will use these details.')
    } catch (requestError) {
      const fieldErrors = {}
      for (const [key, value] of Object.entries(requestError.errors ?? {})) {
        fieldErrors[key.replace(/^defaultAddress\./, '')] = value
      }
      setErrors(fieldErrors)
      setMessage(requestError.message ?? 'Your details could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-card-xl border border-line bg-white p-6 shadow-card sm:p-8" data-testid="delivery-details">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Delivery details</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Saved here, they fill in checkout for you. Only you and the seller of an order see them.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <TextField
          id="account-phone"
          name="phone"
          label="Mobile number"
          autoComplete="tel"
          inputMode="tel"
          placeholder="09171234567"
          icon={Phone}
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            setErrors((current) => ({ ...current, phone: undefined }))
            setMessage('')
          }}
          error={errors.phone}
          disabled={isSaving}
        />

        <AddressForm details={address} errors={errors} onChange={changeAddress} />

        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save delivery details'}
        </button>
      </form>
    </section>
  )
}
