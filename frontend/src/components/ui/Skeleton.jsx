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
          <Skeleton className="h-16" rounded="rounded-2xl" />
          <Skeleton className="h-16" rounded="rounded-2xl" />
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

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only">Loading phone details…</span>
      <Skeleton className="h-4 w-56" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Skeleton className="aspect-[16/10] w-full" rounded="rounded-card-lg" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full" rounded="rounded-2xl" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-9 w-4/5" />
          <Skeleton className="mt-4 h-5 w-1/2" />
          <Skeleton className="mt-8 h-11 w-48" />
          <Skeleton className="mt-8 h-28 w-full" rounded="rounded-card" />
          <Skeleton className="mt-4 h-14 w-full" rounded="rounded-card" />
        </div>
      </div>
    </div>
  )
}

export function LinesSkeleton({ count = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  )
}
