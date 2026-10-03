import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function ListingCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="overflow-hidden rounded-card border border-line bg-white shadow-card"
    >
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-3/4" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </article>
  )
}

export function BrowseResultsSkeleton({ count = 6 }) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Loading verified phone listings"
    >
      <span className="sr-only">Loading verified phone listings…</span>
      {Array.from({ length: count }, (_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function RelatedListingsSkeleton() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Loading more verified phones"
    >
      <span className="sr-only">Loading more verified phones…</span>
      {Array.from({ length: 3 }, (_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function ListingDetailSkeleton() {
  return (
    <div
      className="min-h-[calc(100dvh-4.5rem)] bg-canvas pb-28 lg:pb-0"
      role="status"
      aria-live="polite"
      aria-label="Loading listing details"
    >
      <span className="sr-only">Loading listing details…</span>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="mt-8 grid items-start gap-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:gap-12">
            <div>
              <Skeleton className="aspect-[4/3] w-full rounded-card-xl sm:aspect-[16/10]" />
              <div className="mt-4 grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton
                    key={index}
                    className="aspect-[4/3] rounded-2xl"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-4/5" />
              <div className="flex flex-wrap gap-5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="border-y border-line py-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-12 w-40" />
              </div>
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <div className="rounded-2xl border border-line bg-canvas p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-card border border-line bg-white p-6 shadow-card">
              <Skeleton className="size-12 rounded-2xl" />
              <Skeleton className="mt-6 h-4 w-28" />
              <Skeleton className="mt-2 h-10 w-24" />
              <Skeleton className="mt-5 h-20 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <Skeleton className="h-6 w-40" />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="rounded-card border border-accent-200 bg-accent-50 p-6">
            <Skeleton className="size-7" />
            <Skeleton className="mt-4 h-6 w-36" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        </div>
      </section>
    </div>
  )
}
