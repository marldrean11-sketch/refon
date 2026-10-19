import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../components/ui/Modal.jsx'
import { TextField } from '../../components/ui/TextField.jsx'
import { LoopSpinner } from '../../components/ui/LoopSpinner.jsx'
import { applySiteSettings, updateSiteSettingsRequest } from '../../lib/site-settings.js'

/**
 * Change the booth number (plus the Viber chat link and the announcement
 * banner) on fair day, once the organisers announce it. Every page reads the new value on its next load; the
 * kiosk screen picks it up within a minute.
 */
export function BoothSettingsDialog({ open, settings, onClose, onSaved }) {
  const inputRef = useRef(null)
  const [values, setValues] = useState({ booth: '', viber: '', announcement: '' })
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      setValues({
        booth: settings.booth ?? '',
        viber: settings.viber ?? '',
        announcement: settings.announcement ?? '',
      })
      setErrors({})
    })
    return () => cancelAnimationFrame(id)
  }, [open, settings])

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const booth = values.booth.trim()
    if (!booth) return setErrors({ booth: 'Enter the booth number.' })
    setIsSaving(true)
    setErrors({})
    try {
      const data = await updateSiteSettingsRequest({
        booth,
        viber: values.viber.trim() || null,
        announcement: values.announcement.trim() || null,
      })
      applySiteSettings(data.settings)
      onSaved(data.settings)
    } catch (requestError) {
      setErrors(requestError.errors ?? { form: requestError.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Booth settings"
      description="The booth number shows in the footer, Contact page, kiosk, poster, pop badge and health check card."
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} noValidate data-testid="booth-settings-form" className="grid gap-5">
        <TextField
          ref={inputRef}
          id="booth-number"
          label="Booth number"
          required
          placeholder="7"
          maxLength={10}
          autoComplete="off"
          value={values.booth}
          onChange={(event) => change('booth', event.target.value)}
          hint={`Shows as "Techno Fair Booth #${values.booth.trim() || '…'}".`}
          error={errors.booth}
        />
        <TextField
          id="booth-viber"
          label="Viber chat link"
          optional
          inputMode="url"
          placeholder="https://invite.viber.com/?g2=…"
          autoComplete="off"
          value={values.viber}
          onChange={(event) => change('viber', event.target.value)}
          hint='For the "Chat with us" button. Leave empty to show Viber as "coming soon".'
          error={errors.viber}
        />
        <TextField
          id="booth-announcement"
          label="Announcement banner"
          optional
          placeholder={`Visit us at Booth #${values.booth.trim() || '7'}: free phone health check!`}
          maxLength={140}
          autoComplete="off"
          value={values.announcement}
          onChange={(event) => change('announcement', event.target.value)}
          hint={`Shown above the header on every page (${values.announcement.trim().length}/140). Leave empty to hide it.`}
          error={errors.announcement}
        />
        {errors.form && (
          <p className="text-sm font-semibold text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex justify-end gap-3">
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
            data-testid="booth-settings-save"
            className="rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-page hover:bg-accent-hover disabled:opacity-60"
          >
            {isSaving ? <LoopSpinner className="size-4" /> : <Save className="size-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
