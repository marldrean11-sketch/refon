import { Skeleton } from '../../../components/ui/Skeleton.jsx'

/**
 * Checkout loading placeholder.
 *
 * Mirrors the real two-column checkout so the page does not jump when the cart and
 * the delivery options resolve. The form column shows the shape of the four
 * sections rather than one generic block, so the transition into the real form is
 * a fill rather than a jump.
 */
export function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14" aria-busy="true">
      <span className="sr-only">Loading checkout…</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
        <div className="space-y-5">
          {[0, 1, 2, 3].map((section) => (
            <div
              key={section}
              className="rounded-card-lg border border-line bg-white p-5 sm:p-6"
            >
              <div className="flex items-start gap-3.5">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-72 max-w-full" />
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Skeleton className="h-14 rounded-2xl" />
                    <Skeleton className="h-14 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-96 rounded-card-lg" />
      </div>
    </div>
  )
}
