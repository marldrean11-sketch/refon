import { useLocation } from 'react-router-dom'

/**
 * Route patterns whose pages render their own fixed bottom action bar.
 *
 * A product page shows a sticky price-and-action bar exactly where the mobile tab
 * bar normally sits. Two `fixed inset-x-0 bottom-0` elements cannot share that
 * strip, so only one may render.
 *
 * Deciding this from the route rather than from a DOM flag matters: a flag set by
 * the incoming page is read by the tab bar in an effect that can run first, so the
 * two would resolve on paint order and the result would depend on component
 * ordering. The route is known before anything renders, so this cannot race.
 *
 * Adding a future page with its own action bar means adding its pattern here.
 */
const BOTTOM_ACTION_BAR_PATTERNS = [
  // Product pages: slug is canonical, the id form stays as a legacy alias.
  /^\/phones\/[^/]+$/,
  /^\/listings\/[^/]+$/,
]

/** True when the current path is served by a page that owns the bottom edge. */
export function useOwnsBottomActionBar() {
  const { pathname } = useLocation()

  return BOTTOM_ACTION_BAR_PATTERNS.some((pattern) => pattern.test(pathname))
}