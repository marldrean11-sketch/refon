import { createContext } from 'react'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

export const CompareContext = createContext(null)

/** The most phones a comparison holds. Four columns stop fitting a laptop screen. */
export const COMPARE_LIMIT = 3

/** The compare page URL for a set of listing ids. Shareable, so the ids ride in it. */
export function comparePath(ids) {
  return ids.length > 0 ? `${MARKETPLACE_ROUTES.compare}?ids=${ids.join(',')}` : MARKETPLACE_ROUTES.compare
}
