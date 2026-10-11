import { LogoGlyph } from './BrandMark.jsx'

/**
 * The loading spinner: the Loop outline turning in the current text colour, so
 * it reads on a lime button and on a dark card alike. Decorative; the control
 * or region it sits in carries the busy state for assistive technology.
 */
export function LoopSpinner({ className = 'size-5' }) {
  return <LogoGlyph tile={false} draw={false} loading className={`shrink-0 ${className}`} />
}
