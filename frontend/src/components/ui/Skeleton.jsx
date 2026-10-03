export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-primary-100 motion-reduce:animate-none ${className}`}
    />
  )
}
