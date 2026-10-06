import { Skeleton } from '../../../components/ui/Skeleton.jsx'

/**
 * Cart loading placeholder.
 *
 * Mirrors the real layout — item cards on the left, summary on the right — so the
 * page does not visibly jump when the cart arrives. The summary is hidden on mobile
 * because there the real summary sits below the items.
 */
export function CartSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14"
      aria-busy="true"
      aria-label="Loading your cart"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="flex flex-col gap-5 rounded-card-lg border border-line bg-white p-4 sm:flex-row sm:gap-6 sm:p-5"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:w-40" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-56 max-w-full" />
                <Skeleton className="h-4 w-36" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-16 rounded-pill" />
                  <Skeleton className="h-6 w-16 rounded-pill" />
                  <Skeleton className="h-6 w-24 rounded-pill" />
                </div>
                <Skeleton className="h-7 w-40 rounded-pill" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <Skeleton className="h-80 rounded-card-lg" />
        </div>
      </div>
    </div>
  )
}
