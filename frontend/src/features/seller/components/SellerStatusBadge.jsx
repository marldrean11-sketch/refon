import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  PackageX,
  ShoppingBag,
} from 'lucide-react'

const statusConfig = {
  PENDING: {
    label: 'Pending Review',
    icon: Clock3,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  APPROVED: {
    label: 'Approved',
    icon: BadgeCheck,
    className: 'border-accent-200 bg-accent-50 text-accent-800',
  },
  REJECTED: {
    label: 'Rejected',
    icon: PackageX,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  SOLD: {
    label: 'Sold',
    icon: ShoppingBag,
    className: 'border-primary-200 bg-primary-50 text-primary-700',
  },
}

export function SellerStatusBadge({ status }) {
  const config = statusConfig[status] ?? {
    label: status,
    icon: CheckCircle2,
    className: 'border-line bg-canvas text-muted',
  }
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${config.className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  )
}
