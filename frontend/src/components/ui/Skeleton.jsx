export function Skeleton({ className = '', rounded = 'rounded-control' }) {
  return (
    <div
      className={`animate-pulse bg-surface-3 motion-reduce:animate-none ${rounded} ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Product card skeleton.
 *
 * The shape mirrors `ListingCard` exactly so the grid does not reflow when real
 * data arrives — layout shift on a results grid is very visible.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
      <Skeleton className="aspect-[4/5] w-full" rounded="rounded-none" />
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="mt-3 h-4 w-3/4" />
        <Skeleton className="mt-2 h-2.5 w-1/3" />
        <div className="mt-4 flex items-end gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading phones…</span>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * A neutral loading panel.
 *
 * Dashboard surfaces — the seller and admin queues, the account page — are built
 * from bordered white panels, and a skeleton matching that shape stops the layout
 * jumping when real content lands. `rows` lets a caller hint at how much is coming
 * without hard-coding a skeleton per page.
 */
export function PanelSkeleton({ rows = 3, className = '', label = 'Loading' }) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-5 ${className}`}
      aria-busy="true"
    >
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-2.5 w-24" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  )
}

/** A row of metric placeholders, for dashboards that open with a stat strip. */
export function StatStripSkeleton({ count = 4, className = '' }) {
  const columns = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }

  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line ${columns[count] ?? 'lg:grid-cols-4'} ${className}`}
      aria-busy="true"
    >
      <span className="sr-only">Loading metrics…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-surface px-4 py-4">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-7 w-10" />
        </div>
      ))}
    </div>
  )
}