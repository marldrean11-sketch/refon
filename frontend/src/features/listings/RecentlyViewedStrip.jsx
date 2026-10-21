import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { ListingPhoto } from './ListingPhoto.jsx'
import { readRecentlyViewed } from '../../lib/recently-viewed.js'
import { formatPeso } from '../../lib/format.js'
import { productPath } from '../../lib/routes.js'

/** Phones this browser looked at before, so a shopper can jump back to one. */
export function RecentlyViewedStrip({ currentId }) {
  const [items] = useState(() => readRecentlyViewed().filter((item) => item.id !== currentId))

  if (items.length === 0) return null

  return (
    <section className="border-t border-line bg-canvas" aria-labelledby="recently-viewed-heading" data-testid="recently-viewed">
      <Container className="py-10">
        <h2 id="recently-viewed-heading" className="font-display text-xl font-bold tracking-tight text-ink">
          Recently viewed
        </h2>
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {items.map((item) => (
            <li key={item.id} className="w-40 shrink-0 sm:w-44">
              <Link
                to={productPath(item)}
                className="block rounded-card border border-line bg-card p-2.5 transition-colors hover:border-accent/50"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-well">
                  <ListingPhoto
                    src={item.photo}
                    alt=""
                    className="size-full object-cover"
                    fallback={
                      <span className="grid size-full place-items-center text-subtle">
                        <Smartphone className="size-8" aria-hidden="true" />
                      </span>
                    }
                  />
                </span>
                <span className="mt-2 block truncate text-sm font-semibold text-ink">
                  {item.brand} {item.model}
                </span>
                <span className="block truncate text-xs text-muted">
                  {item.storage} · {item.status === 'SOLD' ? 'Sold' : formatPeso(item.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
