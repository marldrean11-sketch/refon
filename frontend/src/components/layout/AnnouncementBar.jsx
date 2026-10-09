import { Link } from 'react-router-dom'
import { ShieldCheck, Store } from 'lucide-react'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

const LINK =
  'inline-flex min-h-8 items-center gap-1.5 rounded-md text-[13.5px] font-medium text-ink transition-colors duration-150 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/**
 * The utility strip above the header.
 *
 * Company and policy links, in the place large shops keep them: small, quiet,
 * and out of the way of the search bar. It carries the two terms any shop can
 * match — the return window and the free-delivery threshold — so the hero can
 * spend its space on what only ReFon's data backs.
 *
 * It is not sticky and not dismissable. It is navigation, not a banner, and it
 * scrolls away with the page. Below `md` it is hidden: the same links are in the
 * menu, and a phone's first screen belongs to search and the hero.
 */
export function AnnouncementBar() {
  return (
    <div data-testid="utility-bar" className="hidden border-b border-line bg-card md:block">
      <div className="mx-auto flex h-10 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <nav aria-label="Company" className="flex items-center gap-5">
          <Link to={MARKETPLACE_ROUTES.about} className={LINK}>
            About ReFon
          </Link>
          <Link to={MARKETPLACE_ROUTES.qualityCheck} className={LINK}>
            <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
            How we test every phone
          </Link>
        </nav>

        <div className="flex items-center gap-5">
          <Link to={MARKETPLACE_ROUTES.returns} className={`${LINK} hidden lg:inline-flex`}>
            7-day returns · Free delivery over ₱15,000
          </Link>
          <Link to={MARKETPLACE_ROUTES.sellerApply} className={LINK}>
            <Store className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Sell your phone
          </Link>
        </div>
      </div>
    </div>
  )
}
