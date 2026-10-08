import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  PackageX,
  ShoppingBag,
} from 'lucide-react'

/**
 * The listing status chip.
 *
 * Square-cornered, monospace, and hairline-ruled so it belongs to the same
 * instrument panel as the grade and warranty chips on a product card. The colour
 * is a secondary signal only: every state names itself in words, so the chip is
 * still readable in greyscale and to a colour-blind buyer.
 */
const statusConfig = {
  PENDING: {
    label: 'Pending review',
    icon: Clock3,
    className: 'bg-flare-50 text-flare-800 ring-flare-300',
  },
  APPROVED: {
    label: 'Approved',
    icon: BadgeCheck,
    className: 'bg-accent-50 text-accent-800 ring-accent-300',
  },
  REJECTED: {
    label: 'Rejected',
    icon: PackageX,
    className: 'bg-red-50 text-danger ring-red-300',
  },
  SOLD: {
    label: 'Sold',
    icon: ShoppingBag,
    className: 'bg-primary-950 text-white ring-primary-950',
  },
}

export function SellerStatusBadge({ status }) {
  const config = statusConfig[status] ?? {
    label: status,
    icon: CheckCircle2,
    className: 'bg-surface-2 text-muted ring-line-2',
  }
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${config.className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  )
}