import { useState } from 'react'
import { isImageReference } from './image-reference.js'

/**
 * A listing photo that falls back when it cannot be shown.
 *
 * Renders `fallback` instead of the `<img>` when `src` is not a photo reference,
 * or when the file fails to load, so a missing upload (for example one wiped
 * from a host's temporary disk) shows the illustration rather than a broken
 * image icon with its alt text spilling over the layout.
 */
export function ListingPhoto({ src, fallback, ...imgProps }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (!isImageReference(src) || failedSrc === src) {
    return fallback
  }

  return <img src={src} onError={() => setFailedSrc(src)} {...imgProps} />
}
