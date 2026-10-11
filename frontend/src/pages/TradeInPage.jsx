import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, RotateCcw, ScanLine } from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { Confetti } from '../components/ui/Confetti.jsx'
import { FloatingLoops } from '../components/brand/FloatingLoops.jsx'
import { Container } from '../features/design/Container.jsx'
import {
  TRADE_IN_BATTERY,
  TRADE_IN_BRANDS,
  TRADE_IN_GRADES,
  TRADE_IN_MODELS,
  TRADE_IN_SHARE,
  TRADE_IN_STORAGE,
  TRADE_IN_WORKING,
  estimateTradeIn,
} from '../content/trade-in.js'
import { formatPeso } from '../lib/format.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { usePrefersReducedMotion } from '../lib/motion.ts'

const EMPTY = { brand: null, model: null, storage: null, grade: null, battery: null, working: null }

/** Eases a number toward its new value so the estimate counts rather than jumps. */
function useTweened(target, reduced) {
  const [value, setValue] = useState(target ?? 0)
  const fromRef = useRef(target ?? 0)

  useEffect(() => {
    if (target == null) return undefined
    const from = fromRef.current
    if (reduced || from === target) {
      fromRef.current = target
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }

    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 450)
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3))
      fromRef.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])

  return Math.round(value / 100) * 100
}

/**
 * The trade-in estimator.
 *
 * Five quick questions (model, storage, condition, battery, does it work) and an
 * honest price range: 55–65% of what the same phone sells for on ReFon. It runs
 * entirely in the browser, needs no account, and submits nothing. The page says
 * plainly that it is an estimate and that the final figure follows a hands-on
 * check at the booth.
 */
export function TradeInPage() {
  const reduced = usePrefersReducedMotion()
  const [answers, setAnswers] = useState(EMPTY)
  const [burst, setBurst] = useState(0)

  const models = useMemo(
    () => TRADE_IN_MODELS.filter((entry) => entry.brand === answers.brand),
    [answers.brand],
  )
  const estimate = estimateTradeIn(answers)
  const low = useTweened(estimate?.low ?? null, reduced)
  const high = useTweened(estimate?.high ?? null, reduced)
  const wasReady = useRef(false)

  // Celebrate the first time the estimate appears, not on every later tweak.
  useEffect(() => {
    if (estimate && !wasReady.current) {
      wasReady.current = true
      const id = requestAnimationFrame(() => setBurst((count) => count + 1))
      return () => cancelAnimationFrame(id)
    }
    if (!estimate) wasReady.current = false
    return undefined
  }, [estimate])

  useEffect(() => {
    if (!burst) return undefined
    const timer = window.setTimeout(() => setBurst(0), 1100)
    return () => window.clearTimeout(timer)
  }, [burst])

  function pick(key, value) {
    setAnswers((current) => {
      if (key === 'brand') return { ...current, brand: value, model: null }
      return { ...current, [key]: value }
    })
  }

  const steps = [
    {
      key: 'brand',
      title: 'Brand',
      options: TRADE_IN_BRANDS.map((brand) => ({ id: brand, label: brand })),
    },
    {
      key: 'model',
      title: 'Model',
      options: models.map((entry) => ({ id: entry.model, label: entry.model, hint: String(entry.year) })),
      empty: 'Pick a brand first.',
    },
    { key: 'storage', title: 'Storage', options: TRADE_IN_STORAGE },
    { key: 'grade', title: 'Condition', options: TRADE_IN_GRADES },
    { key: 'battery', title: 'Battery health', options: TRADE_IN_BATTERY },
    { key: 'working', title: 'Does everything work?', options: TRADE_IN_WORKING },
  ]

  const answered = steps.filter((step) => answers[step.key]).length
  const brandForShop = answers.brand === 'Google' ? 'Google' : answers.brand

  return (
    <div className="min-h-screen bg-page">
      <div className="relative overflow-hidden border-b border-line">
        <FloatingLoops />
        <Container className="relative py-10 sm:py-14">
          <Breadcrumb
            items={[{ label: 'Home', to: MARKETPLACE_ROUTES.home }, { label: 'Trade-in estimator' }]}
          />
          <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Trade-in estimator</p>
          <h1 className="mt-2 font-display text-[clamp(2.4rem,5vw,4rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink">
            Magkano kaya ’yan?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Six quick taps and you get an honest price range for your old phone. No account, nothing
            submitted: it is worked out right here in your browser.
          </p>
        </Container>
      </div>

      <Container className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <ol className="grid gap-4" aria-label="Trade-in questions">
          {steps.map((step, index) => (
            <li key={step.key} className="rounded-card-lg border border-line bg-card p-5 sm:p-6">
              <fieldset>
                <legend className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-display text-lg font-bold text-ink">{step.title}</span>
                </legend>

                {step.options.length === 0 ? (
                  <p className="mt-3 text-sm text-subtle">{step.empty}</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.options.map((option) => {
                      const selected = answers[step.key] === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          data-testid={`tradein-${step.key}`}
                          aria-pressed={selected}
                          onClick={() => pick(step.key, option.id)}
                          className={`rf-bounce min-h-11 rounded-full border px-4 py-2 text-left text-[15px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            selected
                              ? 'border-chalk bg-chalk text-page'
                              : 'border-line-2 bg-well text-ink hover:border-subtle'
                          }`}
                        >
                          <span className="font-medium">{option.label}</span>
                          {option.hint && (
                            <span className={`ml-2 text-[13px] ${selected ? 'text-page/70' : 'text-subtle'}`}>
                              {option.hint}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </fieldset>
            </li>
          ))}
        </ol>

        <aside className="grid gap-4 lg:sticky lg:top-28">
          <section
            aria-live="polite"
            data-testid="tradein-result"
            className={`relative overflow-hidden rounded-[28px] p-6 transition-colors duration-300 ${
              estimate ? 'bg-accent text-page' : 'border border-line-2 bg-card text-ink'
            }`}
          >
            <Confetti active={burst > 0} burstKey={burst} />
            <p className={`font-mono text-[12px] uppercase tracking-[0.14em] ${estimate ? 'text-page/75' : 'text-accent'}`}>
              Estimated trade-in value
            </p>
            {estimate ? (
              <>
                <p className="mt-3 font-display text-[clamp(2rem,4vw,2.6rem)] font-extrabold leading-none tracking-[-0.03em]">
                  {formatPeso(low)}–{formatPeso(high)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-page/80">
                  About {Math.round(TRADE_IN_SHARE.low * 100)}–{Math.round(TRADE_IN_SHARE.high * 100)}% of what this
                  phone sells for on ReFon ({formatPeso(estimate.shopPrice)}). Final offer after a quick check at the
                  booth.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-3xl font-extrabold text-subtle">₱ — —</p>
                <p className="mt-3 text-sm text-muted">
                  {answered} of {steps.length} answered. Your range appears when all six are done.
                </p>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-label="Questions answered"
                  aria-valuemin={0}
                  aria-valuemax={steps.length}
                  aria-valuenow={answered}
                >
                  <div
                    className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{ transform: `scaleX(${answered / steps.length})` }}
                  />
                </div>
              </>
            )}
          </section>

          <div className="grid gap-2">
            <ButtonLink to={MARKETPLACE_ROUTES.healthCheck} variant="outline">
              <ScanLine className="size-4" aria-hidden="true" />
              Run a health check to confirm
            </ButtonLink>
            {answers.brand && (
              <ButtonLink
                to={`${MARKETPLACE_ROUTES.shop}?brand=${encodeURIComponent(brandForShop)}`}
                variant="ghost"
              >
                See {answers.brand} phones on ReFon
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            )}
            {answered > 0 && (
              <button
                type="button"
                onClick={() => setAnswers(EMPTY)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm text-muted transition-colors hover:text-ink"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Start over
              </button>
            )}
          </div>

          <p className="flex gap-2.5 rounded-card border border-line bg-panel p-4 text-[13px] leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              This is an estimate for the Techno Fair demo, not a binding offer. Prices follow what similar phones
              sell for on ReFon; see{' '}
              <Link to={MARKETPLACE_ROUTES.qualityCheck} className="font-semibold text-ink underline underline-offset-2">
                how we grade
              </Link>
              .
            </span>
          </p>
        </aside>
      </Container>
    </div>
  )
}
