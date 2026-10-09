import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BatteryCharging,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  LockKeyhole,
  LoaderCircle,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Star,
  Smartphone,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { uploadPhotosRequest } from '../features/listings/listing-api.js'
import { useSellerListings } from '../features/seller/useSellerListings.js'
import { useSellerProfile } from '../features/seller/useSellerProfile.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'

const brandOptions = ['Apple', 'Samsung', 'Xiaomi', 'OPPO']
const years = Array.from({ length: 10 }, (_, index) => 2015 + index)
const storageOptions = ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB']
const conditionOptions = ['Good', 'Excellent', 'Like New']
const MAX_PHOTOS = 6
const MAX_COLOR_LENGTH = 80
const MAX_PHOTO_SIZE = 8 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const inputClassName =
  'h-14 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink shadow-sm transition duration-200 placeholder:text-subtle hover:border-line-2 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100'
const labelClassName = 'text-sm font-semibold text-ink'

function createPhotoId(file) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `photo-${crypto.randomUUID()}`
  }

  return `photo-${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`
}

function getInitialPhotos(listing) {
  const urls = listing?.photos ?? []
  const mainPhoto = listing?.mainPhoto
  const orderedUrls =
    mainPhoto && urls.includes(mainPhoto)
      ? [mainPhoto, ...urls.filter((url) => url !== mainPhoto)]
      : urls

  return orderedUrls.slice(0, MAX_PHOTOS).map((url, index) => ({
    id: `existing-${index}-${url}`,
    url,
    name: `Photo ${index + 1}`,
    file: null,
  }))
}

function validatePhotoFile(file) {
  if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
    return 'Use JPG, PNG, or WebP images only.'
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return 'Each image must be 8 MB or smaller.'
  }

  return ''
}

function getInitialForm(listing) {
  return {
    brand: listing?.brand ?? '',
    model: listing?.model ?? '',
    year: listing?.year ?? 2020,
    price: listing ? String(listing.price) : '',
    batteryPercent: listing?.batteryPercent ?? 85,
    storage: listing?.storage ?? '128 GB',
    condition: listing?.condition ?? 'Good',
    // The API substitutes "As pictured" when a listing has no color, so treat that
    // placeholder as an empty field instead of showing it to the seller.
    color: listing?.color && listing.color !== 'As pictured' ? listing.color : '',
    conditionNotes: listing?.conditionNotes ?? '',
  }
}

function validateForm(form, photos) {
  const errors = {}

  if (!form.brand.trim()) {
    errors.brand = 'Brand is required.'
  }

  if (!form.model.trim()) {
    errors.model = 'Model is required.'
  }

  if (!Number.isInteger(Number(form.year)) || Number(form.year) < 2015 || Number(form.year) > 2024) {
    errors.year = 'Choose a model year from 2015 to 2024.'
  }

  if (!form.price || Number(form.price) <= 0) {
    errors.price = 'Enter a price greater than ₱0.'
  }

  if (Number(form.batteryPercent) < 0 || Number(form.batteryPercent) > 100) {
    errors.batteryPercent = 'Battery health must be between 0 and 100.'
  }

  if (form.conditionNotes.trim().length < 10) {
    errors.conditionNotes = 'Add at least 10 characters of cosmetic detail.'
  }

  if (form.color.trim().length > MAX_COLOR_LENGTH) {
    errors.color = `Color must be ${MAX_COLOR_LENGTH} characters or fewer.`
  }

  if (photos.length < 1) {
    errors.photos = 'Add at least one Main Photo before submitting.'
  }

  if (photos.length > MAX_PHOTOS) {
    errors.photos = `A listing can include up to ${MAX_PHOTOS} photos.`
  }

  return errors
}

export function SellerListingFormPage({ mode = 'create' }) {
  const { id } = useParams()
  const { listings, isLoading } = useSellerListings()
  const isEditing = mode === 'edit'
  const existingListing = isEditing
    ? listings.find((listing) => listing.id === id)
    : undefined

  if (isLoading) {
    return (
      <section className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 py-16 text-center text-sm font-semibold text-muted">
        Loading listing from PostgreSQL…
      </section>
    )
  }

  if (isEditing && !existingListing) {
    return (
      <section className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 py-16 text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-danger">
            <AlertCircle className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
            Listing not found
          </h1>
          <p className="mt-3 leading-body text-muted">
            This listing may have been removed from your seller inventory.
          </p>
          <Link
            to={AUTH_ROUTES.seller}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-card"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  if (
    isEditing &&
    existingListing &&
    !['PENDING', 'REJECTED'].includes(existingListing.status)
  ) {
    return (
      <section className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 py-16 text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-700">
            <LockKeyhole className="size-8" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
            Listing locked
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Approved and sold listings cannot be edited.
          </h1>
          <p className="mx-auto mt-3 max-w-lg leading-body text-muted">
            In the next workflow, sellers will create a revision that automatically
            returns to Pending review.
          </p>
          <Link
            to={AUTH_ROUTES.seller}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-card"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  return (
    <SellerListingFormEditor
      key={existingListing?.id ?? 'new'}
      mode={mode}
      existingListing={existingListing}
    />
  )
}

function SellerListingFormEditor({ mode, existingListing }) {
  const isEditing = mode === 'edit'
  const { createListing, updateListing } = useSellerListings()
  const { seller } = useSellerProfile()
  const [form, setForm] = useState(() => getInitialForm(existingListing))
  const [photos, setPhotos] = useState(() => getInitialPhotos(existingListing))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replaceTargetId, setReplaceTargetId] = useState(null)
  const photoUrls = useRef([])
  const uploadedUrlsRef = useRef(new Map())
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(
    () => () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  function createLocalPhoto(file, id = createPhotoId(file)) {
    const url = URL.createObjectURL(file)
    photoUrls.current.push(url)

    return {
      id,
      url,
      name: file.name,
      file,
    }
  }

  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files ?? [])
    const availableSlots = Math.max(0, MAX_PHOTOS - photos.length)
    const nextPhotos = []
    let selectionError = ''

    selectedFiles.slice(0, availableSlots).forEach((file) => {
      const fileError = validatePhotoFile(file)
      if (fileError) {
        selectionError ||= fileError
        return
      }

      nextPhotos.push(createLocalPhoto(file))
    })

    if (selectedFiles.length > availableSlots) {
      setPhotoError(`You can attach up to ${MAX_PHOTOS} photos to a listing.`)
    } else if (selectionError) {
      setPhotoError(selectionError)
    } else {
      setPhotoError('')
    }

    if (nextPhotos.length > 0) {
      setPhotos((current) => [...current, ...nextPhotos])
    }

    event.target.value = ''
  }

  function handleReplacement(event) {
    const file = event.target.files?.[0]
    const targetId = replaceTargetId
    event.target.value = ''

    if (!file || !targetId) {
      return
    }

    const fileError = validatePhotoFile(file)
    if (fileError) {
      setPhotoError(fileError)
      return
    }

    const currentPhoto = photos.find((photo) => photo.id === targetId)
    if (currentPhoto?.file) {
      URL.revokeObjectURL(currentPhoto.url)
      photoUrls.current = photoUrls.current.filter((url) => url !== currentPhoto.url)
    }

    uploadedUrlsRef.current.delete(targetId)
    const replacementPhoto = createLocalPhoto(file, targetId)
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === targetId ? replacementPhoto : photo,
      ),
    )
    setReplaceTargetId(null)
    setPhotoError('')
  }

  function removePhoto(photoId) {
    if (photos.length <= 1) {
      setPhotoError('Keep at least one Main Photo on the listing.')
      return
    }

    const photo = photos.find((item) => item.id === photoId)
    if (photo?.file) {
      URL.revokeObjectURL(photo.url)
      photoUrls.current = photoUrls.current.filter((url) => url !== photo.url)
    }

    uploadedUrlsRef.current.delete(photoId)
    setPhotos((current) => current.filter((item) => item.id !== photoId))
    setPhotoError('')
  }

  function movePhoto(photoId, offset) {
    setPhotos((current) => {
      const currentIndex = current.findIndex((photo) => photo.id === photoId)
      const nextIndex = currentIndex + offset

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [photo] = next.splice(currentIndex, 1)
      next.splice(nextIndex, 0, photo)
      return next
    })
    setPhotoError('')
  }

  function makeMainPhoto(photoId) {
    setPhotos((current) => {
      const currentIndex = current.findIndex((photo) => photo.id === photoId)
      if (currentIndex <= 0) {
        return current
      }

      const next = [...current]
      const [photo] = next.splice(currentIndex, 1)
      next.unshift(photo)
      return next
    })
    setPhotoError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateForm(form, photos)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setFormError('Please correct the highlighted fields before submitting.')
      if (validationErrors.photos) {
        setPhotoError(validationErrors.photos)
      }
      return
    }

    const values = {
      ...form,
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      price: Number(form.price),
      batteryPercent: Number(form.batteryPercent),
      conditionNotes: form.conditionNotes.trim(),
      color: form.color.trim(),
    }

    setIsSubmitting(true)
    setFormError('')
    setPhotoError('')

    try {
      const photosToUpload = photos.filter(
        (photo) => photo.file && !uploadedUrlsRef.current.has(photo.id),
      )

      if (photosToUpload.length > 0) {
        const uploadResponse = await uploadPhotosRequest(
          photosToUpload.map((photo) => photo.file),
        )
        const uploadedUrls =
          uploadResponse.urls ??
          uploadResponse.files?.map((file) => file.url) ??
          []

        if (uploadedUrls.length !== photosToUpload.length) {
          throw new Error('The photo upload returned an incomplete response.')
        }

        photosToUpload.forEach((photo, index) => {
          uploadedUrlsRef.current.set(photo.id, uploadedUrls[index])
        })
      }

      const finalPhotos = photos.map((photo) => {
        if (!photo.file) {
          return photo.url
        }

        const uploadedUrl = uploadedUrlsRef.current.get(photo.id)
        if (!uploadedUrl) {
          throw new Error('One of the selected photos was not uploaded.')
        }

        return uploadedUrl
      })

      values.photos = finalPhotos
      values.mainPhoto = finalPhotos[0]

      if (isEditing) {
        await updateListing(existingListing.id, values)
        navigate(AUTH_ROUTES.seller, {
          replace: true,
          state: {
            notice: {
              type: 'success',
              message: `${values.brand} ${values.model} was resubmitted for review.`,
            },
          },
        })
        return
      }

      await createListing(values)
      navigate(AUTH_ROUTES.seller, {
        replace: true,
        state: {
          notice: {
            type: 'success',
            message: `${values.brand} ${values.model} was submitted for review.`,
          },
        },
      })
    } catch (requestError) {
      const fieldErrors = requestError.errors ?? {}
      setErrors(fieldErrors)
      if (fieldErrors.photos) {
        setPhotoError(fieldErrors.photos)
      }
      setFormError(
        requestError.message ?? 'The listing could not be saved. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewListing = {
    id: existingListing?.id ?? 'seller-preview',
    brand: form.brand.trim() || 'Brand',
    model: form.model.trim() || 'Model preview',
    year: Number(form.year) || 2020,
    price: Number(form.price) || 0,
    batteryPercent: Number(form.batteryPercent) || 0,
    storage: form.storage,
    condition: form.condition,
    conditionNotes: form.conditionNotes,
    color: form.color.trim() || 'As pictured',
    sellerName: seller?.businessName || 'Your shop',
    photos: photos.map((photo) => photo.url),
    mainPhoto: photos[0]?.url ?? null,
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6 sm:py-11 lg:px-8">
          <Link
            to={AUTH_ROUTES.seller}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-primary-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Seller Dashboard
          </Link>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Goes to moderation
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                {isEditing ? 'Edit Listing' : 'Create New Listing'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-body text-muted">
                Complete the condition details buyers need. Submission always resets
                the listing to Pending review.
              </p>
            </div>
            <span className="inline-flex self-start items-center gap-2 rounded-full border border-line bg-canvas px-3 py-2 text-xs font-bold text-muted lg:self-auto">
              <Save className="size-4" aria-hidden="true" />
              PostgreSQL connected
            </span>
          </div>

          {existingListing?.status === 'REJECTED' && existingListing.moderatorFeedback && (
            <div className="mt-7 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="font-bold">Address the moderator feedback</p>
                <p className="mt-1 leading-relaxed">{existingListing.moderatorFeedback}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-6">
              <div className="rounded-card-xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="flex items-center gap-3 border-b border-line pb-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
                    <Smartphone className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink">Phone details</h2>
                    <p className="text-xs text-muted">Core model and pricing information</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="listing-brand" className={labelClassName}>Brand</label>
                    <input
                      id="listing-brand"
                      list="brand-options"
                      value={form.brand}
                      onChange={(event) => updateField('brand', event.target.value)}
                      placeholder="e.g. Samsung"
                      className={`${inputClassName} mt-2 ${errors.brand ? 'border-danger focus:border-danger focus:ring-red-100' : ''}`}
                      aria-invalid={Boolean(errors.brand)}
                       aria-describedby={errors.brand ? 'listing-brand-error' : undefined}
                      required
                    />
                    <datalist id="brand-options">
                      {brandOptions.map((brand) => (
                        <option key={brand} value={brand} />
                      ))}
                    </datalist>
                    {errors.brand && <p id="listing-brand-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.brand}</p>}
                  </div>

                  <div>
                    <label htmlFor="listing-model" className={labelClassName}>Model</label>
                    <input
                      id="listing-model"
                      value={form.model}
                      onChange={(event) => updateField('model', event.target.value)}
                      placeholder="e.g. Galaxy S21"
                      className={`${inputClassName} mt-2 ${errors.model ? 'border-danger focus:border-danger focus:ring-red-100' : ''}`}
                      aria-invalid={Boolean(errors.model)}
                       aria-describedby={errors.model ? 'listing-model-error' : undefined}
                      required
                    />
                    {errors.model && <p id="listing-model-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.model}</p>}
                  </div>

                  <div>
                    <label htmlFor="listing-year" className={labelClassName}>Model year</label>
                    <select
                      id="listing-year"
                      value={form.year}
                      onChange={(event) => updateField('year', Number(event.target.value))}
                      className={`${inputClassName} mt-2 ${errors.year ? 'border-danger focus:border-danger focus:ring-red-100' : ''}`}
                       aria-invalid={Boolean(errors.year)}
                       aria-describedby={errors.year ? 'listing-year-error' : undefined}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {errors.year && <p id="listing-year-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.year}</p>}
                  </div>

                  <div>
                    <label htmlFor="listing-price" className={labelClassName}>Price</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">₱</span>
                      <input
                        id="listing-price"
                        type="number"
                        min="1"
                        step="100"
                        inputMode="numeric"
                        value={form.price}
                        onChange={(event) => updateField('price', event.target.value)}
                        placeholder="15000"
                        className={`${inputClassName} pl-9 ${errors.price ? 'border-danger focus:border-danger focus:ring-red-100' : ''}`}
                        aria-invalid={Boolean(errors.price)}
                         aria-describedby={errors.price ? 'listing-price-error' : undefined}
                        required
                      />
                    </div>
                    {errors.price && <p id="listing-price-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.price}</p>}
                  </div>

                  <div>
                    <label htmlFor="listing-storage" className={labelClassName}>Storage</label>
                    <select
                      id="listing-storage"
                      value={form.storage}
                      onChange={(event) => updateField('storage', event.target.value)}
                      className={`${inputClassName} mt-2`}
                    >
                      {storageOptions.map((storage) => (
                        <option key={storage} value={storage}>{storage}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="listing-condition" className={labelClassName}>Cosmetic grade</label>
                    <select
                      id="listing-condition"
                      value={form.condition}
                      onChange={(event) => updateField('condition', event.target.value)}
                      className={`${inputClassName} mt-2`}
                    >
                      {conditionOptions.map((condition) => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="listing-color" className={labelClassName}>Color</label>
                    <input
                      id="listing-color"
                      maxLength={MAX_COLOR_LENGTH}
                      value={form.color}
                      onChange={(event) => updateField('color', event.target.value)}
                      placeholder="e.g. Awesome Blue"
                      className={`${inputClassName} mt-2 ${errors.color ? 'border-danger focus:border-danger focus:ring-red-100' : ''}`}
                      aria-invalid={Boolean(errors.color)}
                      aria-describedby={errors.color ? 'listing-color-error' : undefined}
                    />
                    {errors.color ? (
                      <p id="listing-color-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.color}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted">Optional. Leave blank if the finish is not known.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-card-xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="flex items-center gap-3 border-b border-line pb-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-accent-700">
                    <BatteryCharging className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink">Condition details</h2>
                    <p className="text-xs text-muted">Be specific and honest for buyers</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <label htmlFor="listing-battery" className={labelClassName}>Battery health</label>
                      <p className="mt-1 text-xs text-muted">Current maximum-charge capacity</p>
                    </div>
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.batteryPercent}
                        onChange={(event) => updateField('batteryPercent', event.target.value)}
                        className={`${inputClassName} pr-8 text-right font-bold`}
                        aria-label="Battery health percentage"
                         aria-describedby={errors.batteryPercent ? 'listing-battery-error' : undefined}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">%</span>
                    </div>
                  </div>
                  <input
                    id="listing-battery"
                    aria-describedby={errors.batteryPercent ? 'listing-battery-error' : undefined}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={form.batteryPercent}
                    onChange={(event) => updateField('batteryPercent', event.target.value)}
                    className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-well accent-accent-500"
                  />
                  <div className="mt-2 flex justify-between text-xs font-semibold text-muted">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  {errors.batteryPercent && <p id="listing-battery-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.batteryPercent}</p>}
                </div>

                <div className="mt-6">
                  <label htmlFor="listing-notes" className={labelClassName}>Cosmetic condition notes</label>
                  <textarea
                    id="listing-notes"
                    rows={6}
                    maxLength={800}
                    value={form.conditionNotes}
                    onChange={(event) => updateField('conditionNotes', event.target.value)}
                    placeholder="Describe scratches, dents, marks on the frame, screen, back, and camera area…"
                    className={`mt-2 w-full resize-none rounded-2xl border bg-white p-4 text-[15px] leading-body text-ink shadow-sm transition duration-200 placeholder:text-subtle focus:outline-none focus:ring-4 ${
                      errors.conditionNotes
                        ? 'border-danger focus:border-danger focus:ring-red-100'
                        : 'border-line hover:border-line-2 focus:border-primary-500 focus:ring-primary-100'
                    }`}
                    aria-invalid={Boolean(errors.conditionNotes)}
                   aria-describedby={errors.conditionNotes ? 'listing-notes-error' : undefined}
                    required
                  />
                  <div className="mt-2 flex items-center justify-between gap-4">
                    {errors.conditionNotes ? (
                      <p id="listing-notes-error" role="alert" className="text-xs font-medium text-danger">{errors.conditionNotes}</p>
                    ) : (
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <Info className="size-3.5" aria-hidden="true" />
                        Clear notes reduce buyer back-and-forth.
                      </p>
                    )}
                    <span className="shrink-0 text-xs text-muted">{form.conditionNotes.length}/800</span>
                  </div>
                </div>
              </div>

              <div className="rounded-card-xl border border-line bg-white p-5 shadow-card sm:p-7">
                <div className="flex items-center gap-3 border-b border-line pb-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                    <Camera className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink">Photos</h2>
                    <p className="text-xs text-muted">Up to 6 images · first photo is the Main Photo</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  id="listing-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFiles}
                   aria-describedby={photoError ? 'listing-photos-error' : undefined}
                  className="sr-only"
                />
                <input
                  ref={replaceInputRef}
                  id="listing-photo-replacement"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleReplacement}
                  className="sr-only"
                />

                <div className="mt-6">
                  {photoError && (
                    <div
                      id="listing-photos-error"
                       className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                      role="alert"
                    >
                      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                      <p>{photoError}</p>
                    </div>
                  )}

                  {photos.length < MAX_PHOTOS && (
                    <label
                      htmlFor="listing-photos"
                      className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-6 text-center transition duration-200 hover:border-primary-400 hover:bg-primary-50"
                    >
                      <span className="grid size-12 place-items-center rounded-2xl bg-white text-primary-700 shadow-sm">
                        <UploadCloud className="size-6" aria-hidden="true" />
                      </span>
                      <span className="mt-4 text-sm font-bold text-ink">Choose listing photos</span>
                      <span className="mt-1 text-xs leading-relaxed text-muted">
                        JPG, PNG, or WebP. The first selected image becomes the Main Photo.
                      </span>
                    </label>
                  )}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {photos.map((photo, index) => (
                        <div key={photo.id} className="overflow-hidden rounded-2xl border border-line bg-canvas">
                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={photo.name}
                              loading="lazy"
                              decoding="async"
                              className="aspect-[4/3] w-full object-cover"
                            />
                            {index === 0 && (
                              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm">
                                <Star className="size-3.5 fill-current" aria-hidden="true" />
                                Main Photo
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              disabled={photos.length <= 1}
                              className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl bg-white/90 text-danger shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Remove ${photo.name}`}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="truncate text-xs font-semibold text-ink" title={photo.name}>
                              {photo.name}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplaceTargetId(photo.id)
                                  replaceInputRef.current?.click()
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
                              >
                                <RefreshCw className="size-3.5" aria-hidden="true" />
                                Replace
                              </button>
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => makeMainPhoto(photo.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-2 text-[11px] font-bold text-primary-700 transition hover:bg-primary-100"
                                >
                                  <Star className="size-3.5" aria-hidden="true" />
                                  Make Main
                                </button>
                              )}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                                Gallery order {index + 1} of {photos.length}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => movePhoto(photo.id, -1)}
                                  disabled={index === 0}
                                  className="grid size-8 place-items-center rounded-lg border border-line bg-white text-muted transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Move ${photo.name} earlier`}
                                >
                                  <ChevronLeft className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePhoto(photo.id, 1)}
                                  disabled={index === photos.length - 1}
                                  className="grid size-8 place-items-center rounded-lg border border-line bg-white text-muted transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Move ${photo.name} later`}
                                >
                                  <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div
                  className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                  <p>{formError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 rounded-card-xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="inline-flex items-center gap-2 text-xs leading-relaxed text-muted">
                  <ShieldCheck className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
                  Submission sends this listing to Pending review.
                </p>
                <div className="flex gap-3">
                  <Link
                    to={AUTH_ROUTES.seller}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-muted transition hover:bg-canvas"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Send className="size-4" aria-hidden="true" />
                        {isEditing ? 'Resubmit for Review' : 'Submit for Review'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24">
              <div className="rounded-card-xl border border-line bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">Live preview</p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-ink">What buyers will see</h2>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
                    <ImagePlus className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-5">
                  <ListingCard listing={previewListing} preview />
                </div>
                <div className="mt-5 flex gap-3 rounded-2xl bg-primary-50 p-4 text-xs leading-relaxed text-primary-900">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary-700" aria-hidden="true" />
                  <p>
                    The first photo is the Main Photo shown on cards. All uploaded photos remain available in the listing gallery.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </section>
    </div>
  )
}
