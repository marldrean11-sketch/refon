import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, ImagePlus, Palette, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TextField } from '../../../components/ui/TextField.jsx'
import { Panel } from '../../design/Surfaces.jsx'
import { uploadPhotosRequest } from '../../listings/listing-api.js'
import { sellerPath } from '../../../lib/routes.js'
import { updateStorefrontRequest } from '../seller-api.js'
import { BANNER_LOGO, BRAND_COLORS, SellerAvatar } from '../brand.jsx'

const EMPTY = { tagline: '', city: '', region: '', logoUrl: '', bannerUrl: '', brandColor: '' }

function fromSeller(seller) {
  const settings = seller?.storefront ?? {}
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, settings[key] ?? '']))
}

/** One image slot: preview, upload/replace, remove. */
function ImageSlot({ label, hint, value, onChange, onError, disabled, wide }) {
  const fileRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsUploading(true)
    onError('')
    try {
      const response = await uploadPhotosRequest([file])
      const url = response.urls?.[0] ?? response.files?.[0]?.url
      if (!url) throw new Error('The image could not be uploaded.')
      onChange(url)
    } catch (requestError) {
      onError(requestError.message ?? 'The image could not be uploaded.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
        {label}
        <span className="ml-1.5 font-normal normal-case tracking-normal text-subtle">{hint}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`relative overflow-hidden rounded-xl border border-dashed border-line-2 bg-well ${wide ? 'h-20 w-48' : 'size-20'}`}>
          {value ? (
            <>
              <img src={value} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label={`Remove ${label.toLowerCase()}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-card/90 text-muted hover:text-danger"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <span className="grid size-full place-items-center text-subtle">
              <ImagePlus className="size-5" aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {isUploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={handleFile}
        />
      </div>
    </div>
  )
}

/**
 * How the seller's storefront looks: logo, banner, colour, tagline and city.
 * A live preview shows the result before saving.
 */
export function StorefrontSettingsCard({ seller, onSaved }) {
  const [values, setValues] = useState(() => fromSeller(seller))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const dirtyRef = useRef(false)

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

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setErrors({})
    try {
      const response = await updateStorefrontRequest(values)
      dirtyRef.current = false
      if (response.seller) setValues(fromSeller(response.seller))
      setMessage('Saved. Your storefront is updated.')
      onSaved?.()
    } catch (requestError) {
      setErrors(requestError.errors ?? {})
      setMessage(requestError.message ?? 'Your storefront could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const preview = { ...values, businessName: seller?.businessName }
  const swatch = BRAND_COLORS[values.brandColor] ?? BRAND_COLORS.lime

  return (
    <Panel className="p-5 sm:p-6" data-testid="storefront-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <Palette className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Store look</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Your logo, banner and colour appear on your storefront and next to every phone you sell.
            </p>
          </div>
        </div>
        {seller?.id && (
          <Link
            to={sellerPath(seller.id)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            View my storefront
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Live preview of the storefront masthead. */}
      <div className="mt-5 overflow-hidden rounded-card border border-line" aria-hidden="true">
        <div
          className="relative h-24"
          style={{ background: `linear-gradient(120deg, ${swatch.hex}55, ${swatch.hex}10 55%, transparent)` }}
        >
          {values.bannerUrl && <img src={values.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />}
        </div>
        <div className="flex items-end gap-3 px-4 pb-4">
          <SellerAvatar seller={preview} rounded="rounded-2xl" className={`${BANNER_LOGO} -mt-9 border-surface`} />
          <div className="min-w-0 pb-1">
            <p className="truncate font-display text-base font-bold text-ink">{seller?.businessName}</p>
            <p className="truncate text-xs text-muted">
              {values.tagline || 'Your tagline appears here'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
        <ImageSlot
          label="Logo"
          hint="square works best"
          value={values.logoUrl}
          onChange={(url) => change('logoUrl', url)}
          onError={(text) => setErrors((current) => ({ ...current, logoUrl: text || undefined }))}
          disabled={isSaving}
        />
        <ImageSlot
          label="Banner"
          hint="wide photo"
          wide
          value={values.bannerUrl}
          onChange={(url) => change('bannerUrl', url)}
          onError={(text) => setErrors((current) => ({ ...current, bannerUrl: text || undefined }))}
          disabled={isSaving}
        />
        {(errors.logoUrl || errors.bannerUrl) && (
          <p className="text-sm text-danger sm:col-span-2">{errors.logoUrl ?? errors.bannerUrl}</p>
        )}

        <fieldset className="sm:col-span-2">
          <legend className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
            Store colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BRAND_COLORS).map(([key, color]) => {
              const selected = (values.brandColor || 'lime') === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => change('brandColor', key)}
                  aria-pressed={selected}
                  aria-label={color.label}
                  title={color.label}
                  className={`rf-bounce grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-surface transition ${
                    selected ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-line-2'
                  }`}
                  style={{ backgroundColor: color.hex, color: color.ink }}
                >
                  {selected && <Check className="size-4" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </fieldset>

        <TextField
          id="store-tagline"
          className="sm:col-span-2"
          label="Tagline"
          optional
          maxLength={200}
          placeholder="Inspected iPhones, honest grades, fast replies."
          value={values.tagline}
          onChange={(event) => change('tagline', event.target.value)}
          error={errors.tagline}
          disabled={isSaving}
        />
        <TextField
          id="store-city"
          label="City"
          optional
          maxLength={120}
          placeholder="Quezon City"
          value={values.city}
          onChange={(event) => change('city', event.target.value)}
          error={errors.city}
          disabled={isSaving}
        />
        <TextField
          id="store-region"
          label="Region"
          optional
          maxLength={120}
          placeholder="Metro Manila"
          value={values.region}
          onChange={(event) => change('region', event.target.value)}
          error={errors.region}
          disabled={isSaving}
        />

        {message && (
          <p role="status" className="text-sm text-muted sm:col-span-2">
            {message}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-page shadow-card transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save store look'}
          </button>
        </div>
      </form>
    </Panel>
  )
}
