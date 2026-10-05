const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const pesoPreciseFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-PH')

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Formats a peso amount for the whole Philippine market, e.g. "₱24,990". */
export function formatPeso(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return '₱—'
  }

  return pesoFormatter.format(amount)
}

/** Formats a peso amount with centavos. Used on money that must reconcile exactly. */
export function formatPesoPrecise(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return '₱—'
  }

  return pesoPreciseFormatter.format(amount)
}

export function formatNumber(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return '—'
  }

  return numberFormatter.format(amount)
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateFormatter.format(date)
}

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateTimeFormatter.format(date)
}

/** Relative time for inbox and timeline copy, e.g. "3h ago". */
export function formatRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(deltaSeconds)

  if (absoluteSeconds < 60) {
    return 'just now'
  }

  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2629800],
    ['year', 31557600],
  ]

  let chosen = units[0]

  for (const unit of units) {
    if (absoluteSeconds >= unit[1]) {
      chosen = unit
    }
  }

  const amount = Math.round(deltaSeconds / chosen[1])

  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(amount, chosen[0])
}

/** Turns "2021" into "Member since 2021" style copy without another formatter. */
export function formatYearRange(startYear, endYear = new Date().getFullYear()) {
  const from = Number(startYear)
  const to = Number(endYear)

  if (!Number.isFinite(from)) {
    return ''
  }

  const months = Math.max(
    0,
    (to - from) * 12 + (new Date().getMonth() - 0),
  )

  if (months < 12) {
    return `${Math.max(months, 1)} ${months === 1 ? 'month' : 'months'} on ReFon`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'} on ReFon`
  }

  return `${years}y ${remainingMonths}m on ReFon`
}

/** Truncates long seller and listing labels without cutting mid-word. */
export function truncate(value, maxLength = 60) {
  const text = String(value ?? '').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}
