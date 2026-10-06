/**
 * The four destination links in the navbar.
 *
 * Kept in the existing `navigation-config.js` vocabulary so the navbar, the
 * mobile menu, and the accessibility tree all read one list. `PRIMARY_NAV` there
 * carries five entries; `How it works` and `How we test` have been merged into a
 * single link, and `How we test` is reachable from the footer and from the
 * homepage's inspection section, so nothing became unreachable.
 *
 * No trade-in entry: there is no trade-in route, and inventing a destination
 * would be worse than the missing link. See the Phase 2 report.
 */
export const NAVBAR_LINKS = [
  {
    key: 'shop',
    label: 'Shop',
    to: '/phones',
    // One shopper-facing destination, so the highlight spans every way into it.
    activePaths: ['/phones', '/browse', '/phones/*', '/listings/*', '/compare'],
  },
  {
    key: 'categories',
    label: 'Categories',
    to: '/categories',
    activePaths: ['/categories', '/categories/*'],
  },
  {
    key: 'howItWorks',
    label: 'How it works',
    to: '/how-it-works',
    activePaths: ['/how-it-works', '/quality-check'],
  },
]

/** Prefixes match their section; exact paths match only themselves. */
function matchesPattern(pathname, pattern) {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  return pathname === pattern
}

export function isNavbarLinkActive(link, pathname) {
  return link.activePaths.some((pattern) => matchesPattern(pathname, pattern))
}

/**
 * The `layoutId` for the active underline.
 *
 * One shared id across every link is what makes the underline travel: Framer
 * Motion animates an element from one tree position to another when the id
 * stays the same, so there is no exit animation to write and no two underlines
 * that can overlap. `reduced` gets its own id so that under reduced motion the
 * underline is simply present or absent rather than sliding.
 */
export function underlineLayoutId(reduced) {
  return reduced ? 'navbar-underline-static' : 'navbar-underline'
}