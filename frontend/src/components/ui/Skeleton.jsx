export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 motion-reduce:animate-none ${rounded} ${className}`}
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
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <Skeleton className="aspect-[4/3] w-full" rounded="rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/3" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-16" rounded="rounded-control" />
          <Skeleton className="h-16" rounded="rounded-control" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
      className={`rounded-card border border-line bg-white p-5 shadow-card ${className}`}
      aria-busy="true"
    >
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-4 w-32" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" rounded="rounded-control" />
        ))}
      </div>
    </div>
  )
}
