import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatPeso } from '../../../lib/format.js'

/**
 * Price movement between the price this device was added at and its price now.
 *
 * An increase is stated as a warning and never applied silently; a decrease is
 * stated plainly rather than celebrated, because ReFon does not claim savings it
 * cannot substantiate. Both show the previous and the current figure so the buyer
 * can see which number they are looking at.
 *
 * The backend has already decided which price applies — the cart subtotal uses the
 * live listing price — so this component only reports. It never recalculates a
 * total.
 */
export function PriceChangeNotice({ item, className = '' }) {
  if (!item?.priceChanged) {
    return null
  }

  const increased = Number(item.priceDelta) > 0
  const Icon = increased ? ArrowUpRight : ArrowDownRight

  const styles = increased
    ? {
        wrapper: 'border-amber-300 bg-amber-50',
        icon: 'text-amber-700',
        title: 'text-amber-950',
        body: 'text-amber-900',
        price: 'text-amber-950',
        previous: 'text-amber-700',
      }
    : {
        wrapper: 'border-accent-200 bg-accent-50',
        icon: 'text-accent-700',
        title: 'text-accent-900',
        body: 'text-accent-800',
        price: 'text-accent-900',
        previous: 'text-accent-700',
      }

  return (
    <div
      className={`rounded-2xl border p-3.5 ${styles.wrapper} ${className}`}
      role="status"
      data-testid="price-change"
      data-direction={increased ? 'INCREASED' : 'DECREASED'}
    >
      <p className={`flex items-center gap-2 text-xs font-bold ${styles.title}`}>
        <Icon className={`size-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
        {increased ? 'Price updated' : 'Good news — the price decreased'}
      </p>

      <p className={`mt-1.5 text-xs leading-relaxed ${styles.body}`}>
        {increased
          ? 'This phone costs more now than when you added it. You will be charged the current price.'
          : 'This phone costs less now than when you added it.'}
      </p>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="text-muted">Previous price</span>
        <span className={`font-semibold line-through ${styles.previous}`}>
          {formatPeso(item.priceSnapshot)}
        </span>
        <span className="text-muted">·</span>
        <span className="text-muted">Current price</span>
        <span className={`font-display font-bold ${styles.price}`}>
          {formatPeso(item.currentPrice)}
        </span>
      </p>
    </div>
  )
}
