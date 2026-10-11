import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * The three things a visitor can do at the booth, as three big tiles. The first
 * is filled lime because the health check is the one people try first.
 */
const TILES = Object.freeze([
  {
    key: 'health',
    eyebrow: '01 · At the booth',
    title: 'Check mo muna.',
    body: 'Screen, touch, speaker, mic, cameras and sensors, tested in your browser. No app, no sign-up.',
    cta: 'Start health check',
    to: MARKETPLACE_ROUTES.healthCheck,
    filled: true,
  },
  {
    key: 'tradein',
    eyebrow: '02 · Trade-in',
    title: 'Magkano kaya ’yan?',
    body: 'Pick your model, storage and condition. Get an honest price range in seconds.',
    cta: 'Estimate my phone',
    to: MARKETPLACE_ROUTES.tradeIn,
  },
  {
    key: 'shop',
    eyebrow: '03 · Shop',
    title: 'Walang tinatago.',
    body: 'Graded phones from verified sellers. Add one to your cart and it is held for you for 15 minutes.',
    cta: 'Browse phones',
    to: MARKETPLACE_ROUTES.shop,
  },
])

export function BoothFeaturesSection() {
  return (
    <section aria-label="What you can do on ReFon" className="bg-page py-16 sm:py-20">
      <Container>
        <ul className="grid gap-4 md:grid-cols-3">
          {TILES.map((tile) => (
            <li key={tile.key}>
              <Link
                to={tile.to}
                data-testid="booth-tile"
                className={`rf-lift group flex h-full min-h-[270px] flex-col gap-4 rounded-[28px] p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                  tile.filled
                    ? 'bg-accent text-page'
                    : 'border border-line-2 bg-card text-ink hover:border-accent/60'
                }`}
              >
                <span
                  className={`font-mono text-[12px] uppercase tracking-[0.14em] ${
                    tile.filled ? 'text-page/80' : 'text-accent'
                  }`}
                >
                  {tile.eyebrow}
                </span>
                <span
                  className={`font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${
                    tile.filled ? 'text-page' : 'text-ink'
                  }`}
                >
                  {tile.title}
                </span>
                <span className={`text-[16px] leading-relaxed ${tile.filled ? 'text-page/85' : 'text-muted'}`}>
                  {tile.body}
                </span>
                <span className="mt-auto inline-flex items-center gap-2 font-semibold">
                  {tile.cta}
                  <ArrowRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
