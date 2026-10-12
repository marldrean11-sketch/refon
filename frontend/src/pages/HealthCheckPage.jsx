import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCopy, Info, RotateCcw, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Button, ButtonLink } from '../components/ui/Button.jsx'
import { Confetti } from '../components/ui/Confetti.jsx'
import { FloatingLoops } from '../components/brand/FloatingLoops.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Container } from '../features/design/Container.jsx'
import { StatusDot } from '../features/design/Surfaces.jsx'
import {
  CHECK_STATUS,
  HEALTH_CHECKS,
  buildReportText,
  detectSupport,
  unsupportedReason,
  readDeviceFacts,
} from '../features/health-check/health-checks.js'
import { DisplayTest, TouchTest } from '../features/health-check/FullscreenTests.jsx'
import {
  BatteryTest,
  CameraTest,
  MicrophoneTest,
  MotionTest,
  SpeakerTest,
  VibrationTest,
} from '../features/health-check/InlineTests.jsx'
import { INSPECTION_CHECKS } from '../lib/listing-taxonomy.js'
import { UpgradePicks } from '../features/health-check/UpgradePicks.jsx'
import {
  checkedTodayLabel,
  recordHealthCheckRun,
  useHealthCheckStats,
} from '../features/health-check/health-check-stats.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

const TESTS = {
  display: DisplayTest,
  touch: TouchTest,
  speaker: SpeakerTest,
  microphone: MicrophoneTest,
  camera: CameraTest,
  vibration: VibrationTest,
  motion: MotionTest,
  battery: BatteryTest,
}

/** The two tests that take over the screen rather than opening inside their row. */
const FULLSCREEN = new Set(['display', 'touch'])

const INSPECTION_LABELS = Object.fromEntries(
  INSPECTION_CHECKS.map((check) => [check.id, check.label]),
)

/**
 * The phone health check.
 *
 * A visitor runs it on the phone in their hand — at a booth, from a QR code on a
 * laptop screen, or before buying from a stranger. Each row is one hardware test
 * the browser can genuinely reach; the report at the end can be copied as text.
 *
 * It is honest about its reach in two places: tests the browser cannot run are
 * marked as such instead of failing, and the page says plainly that battery
 * health, biometrics, buttons and IMEI are outside what a web page can see.
 */
export function HealthCheckPage() {
  const toast = useToast()
  const [support] = useState(detectSupport)
  const [facts] = useState(readDeviceFacts)
  const [results, setResults] = useState({})
  const [active, setActive] = useState(null)

  const finish = useCallback((id, status, note) => {
    setResults((current) => ({ ...current, [id]: { status, note } }))
    setActive((current) => (current === id ? null : current))
  }, [])

  const counts = useMemo(() => {
    const values = Object.values(results)

    return {
      done: values.length,
      passed: values.filter((result) => result.status === 'passed').length,
      failed: values.filter((result) => result.status === 'failed').length,
    }
  }, [results])

  // Count this phone once, after three checks (or every check this browser can
  // run, when that is fewer). One visit is one phone, however often it reruns.
  const stats = useHealthCheckStats()
  const recorded = useRef(false)
  const runnable = HEALTH_CHECKS.filter((check) => support[check.id]).length
  useEffect(() => {
    if (recorded.current || counts.done < Math.min(3, Math.max(1, runnable))) return
    recorded.current = true
    recordHealthCheckRun({ completed: counts.done, passed: counts.passed })
      .then((response) => {
        if (response?.stats) {
          window.dispatchEvent(new CustomEvent('refon:health-stats', { detail: response.stats }))
        }
      })
      .catch(() => {
        // The counter is a nicety; a failed post never interrupts the test.
      })
  }, [counts.done, counts.passed, runnable])

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(buildReportText(results, facts))
      toast.success('Report copied')
    } catch {
      toast.error("Couldn't copy the report", {
        description: 'Your browser blocked clipboard access.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="relative overflow-hidden border-b border-line bg-page">
        <FloatingLoops />
        <Container className="relative py-8 sm:py-12">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Phone health check' },
            ]}
          />

          <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <ProgressRing done={counts.done} total={HEALTH_CHECKS.length} />
              <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
                Phone health check
                {checkedTodayLabel(stats) && (
                  <span data-testid="checked-today" className="rounded-full border border-accent/40 bg-accent-100 px-2.5 py-0.5 normal-case tracking-normal">
                    {checkedTodayLabel(stats)}
                  </span>
                )}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-ink sm:text-[2.75rem] sm:leading-[1.05]">
                {counts.done === HEALTH_CHECKS.length ? 'Ayos! All done.' : 'Check mo muna.'}
              </h1>
              <p className="mt-3 max-w-2xl leading-body text-muted">
                Eight checks that run in your browser: screen, touch, speaker, microphone,
                cameras, vibration, motion sensors and battery. Nothing is uploaded, and you
                get a report you can copy at the end.
              </p>
              </div>
            </div>

            <ScanPanel />
          </div>
        </Container>
      </div>

      <Container className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ol className="grid gap-3" aria-label="Health checks">
          {HEALTH_CHECKS.map((check, index) => (
            <CheckRow
              key={check.id}
              check={check}
              number={index + 1}
              supported={support[check.id]}
              result={results[check.id]}
              isActive={active === check.id}
              onStart={() => setActive(check.id)}
              onFinish={finish}
            />
          ))}
        </ol>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <section
            aria-labelledby="report-heading"
            className="rounded-card-lg border border-line bg-card p-5 shadow-card"
          >
            <h2 id="report-heading" className="text-lg font-bold tracking-tight text-ink">
              Your report
            </h2>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {counts.done === 0
                ? 'Run a check to start your report.'
                : `${counts.done} of ${HEALTH_CHECKS.length} done · ${counts.passed} passed${
                    counts.failed > 0 ? ` · ${counts.failed} with a problem` : ''
                  }`}
            </p>

            <ul className="mt-4 grid gap-2">
              {HEALTH_CHECKS.map((check) => {
                const status = CHECK_STATUS[results[check.id]?.status ?? 'idle']

                return (
                  <li key={check.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink">{check.label}</span>
                    <StatusDot tone={status.tone} label={status.label} className="text-muted" />
                  </li>
                )
              })}
            </ul>

            <div className="mt-5 grid gap-2">
              <Button variant="primary" onClick={copyReport} disabled={counts.done === 0}>
                <ClipboardCopy className="size-4" aria-hidden="true" />
                Copy report
              </Button>
              {counts.done > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResults({})
                    setActive(null)
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Start over
                </Button>
              )}
            </div>
          </section>

          <section
            aria-labelledby="device-heading"
            className="rounded-card-lg border border-line bg-card p-5"
          >
            <h2 id="device-heading" className="text-sm font-bold text-ink">
              What this browser reports
            </h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="text-right font-semibold tabular-nums text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-card-lg border border-line-2 bg-card p-5">
            <h2 className="font-display text-lg font-bold text-ink">Magkano kaya ’yan?</h2>
            <p className="mt-1 text-sm text-muted">
              Done testing? See an honest trade-in range for this phone.
            </p>
            <ButtonLink to={MARKETPLACE_ROUTES.tradeIn} variant="outline" size="sm" className="mt-4">
              Estimate my phone
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </section>

          <p className="flex gap-2.5 rounded-card border border-line bg-panel p-4 text-[13px] leading-relaxed text-ink/80">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              This is a browser self-test, not ReFon’s{' '}
              <Link to={MARKETPLACE_ROUTES.qualityCheck} className="font-semibold underline underline-offset-2">
                11-point inspection
              </Link>
              . Web pages can’t read battery health, biometrics, the physical buttons or the
              IMEI.
            </span>
          </p>
        </aside>
      </Container>

      <Container className="pb-12">
        <UpgradePicks done={counts.done === HEALTH_CHECKS.length} />
      </Container>
    </div>
  )
}

function CheckRow({ check, number, supported, result, isActive, onStart, onFinish }) {
  const Test = TESTS[check.id]
  const status = CHECK_STATUS[result?.status ?? 'idle']
  const inspectionLabel = check.inspectionId ? INSPECTION_LABELS[check.inspectionId] : null
  const [burst, setBurst] = useState(0)
  const report = useCallback(
    (nextStatus, note) => {
      if (nextStatus === 'passed') setBurst((count) => count + 1)
      onFinish(check.id, nextStatus, note)
    },
    [check.id, onFinish],
  )

  // The burst is a moment, not a state: it clears itself after its flight.
  useEffect(() => {
    if (!burst) return undefined
    const timer = window.setTimeout(() => setBurst(0), 900)
    return () => window.clearTimeout(timer)
  }, [burst])

  return (
    <li
      className={`rf-spotlight rounded-card border bg-card transition-[border-color,box-shadow] duration-200 hover:border-line-2 ${
        isActive ? 'border-accent/60 shadow-card' : result?.status === 'passed' ? 'border-accent/30' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:p-5">
        <span className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-accent" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1 basis-48">
          <h2 className="text-base font-bold text-ink">{check.label}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{check.summary}</p>
          {inspectionLabel && (
            <p className="mt-1.5 text-xs text-muted">Matches inspection step: {inspectionLabel}</p>
          )}
          {result?.note && <p className="mt-2 text-sm text-ink">{result.note}</p>}
          {!supported && unsupportedReason(check.id) && (
            <p className="mt-2 text-sm text-ink" data-testid={`unsupported-${check.id}`}>
              {unsupportedReason(check.id)}
            </p>
          )}
        </div>

        <div className="relative flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
          <Confetti active={burst > 0} burstKey={burst} />
          <StatusDot tone={status.tone} label={status.label} className="text-ink" />
          {supported ? (
            !isActive && (
              <Button size="sm" variant={result ? 'secondary' : 'primary'} onClick={onStart}>
                {result ? 'Run again' : 'Start'}
              </Button>
            )
          ) : (
            <span className="text-xs text-muted">Not available in this browser</span>
          )}
        </div>
      </div>

      {isActive && supported && (
        <div className="border-t border-line px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          {FULLSCREEN.has(check.id) ? (
            <p className="text-sm text-muted">Running full screen…</p>
          ) : null}
          <Test onResult={report} />
        </div>
      )}
    </li>
  )
}

/**
 * On a laptop or desktop, a QR code that opens this page on a phone. This is the
 * booth set-up: the page on a big screen, visitors scanning it with their own
 * phone. Hidden on touch devices, which are already where the test should run.
 */
function ScanPanel() {
  const [svg, setSvg] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)
  const url = typeof window === 'undefined' ? '' : window.location.href

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const apply = () => setIsDesktop(query.matches)

    apply()
    query.addEventListener('change', apply)

    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!isDesktop || !url) {
      return
    }

    let cancelled = false

    QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a0b0d', light: '#f2f4f0' },
    })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isDesktop, url])

  if (!isDesktop || !svg) {
    return null
  }

  return (
    <div className="flex shrink-0 items-center gap-4 rounded-card-lg border border-accent/40 bg-card/90 p-4 backdrop-blur">
      <div
        className="size-32 shrink-0 rounded-xl bg-chalk p-2.5 [&>svg]:size-full"
        role="img"
        aria-label="QR code that opens this page"
        // The markup is generated locally by `qrcode` from this page's own URL.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="max-w-[12rem]">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Smartphone className="size-4" aria-hidden="true" />
          Scan with your phone
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          The checks need the phone’s own screen, speaker and sensors.
        </p>
      </div>
    </div>
  )
}

/** Progress through the checks, as a lime ring that fills with each result. */
function ProgressRing({ done, total }) {
  const circumference = 2 * Math.PI * 38
  const filled = total ? (done / total) * circumference : 0

  return (
    <svg
      viewBox="0 0 92 92"
      className="size-24 shrink-0 sm:size-28"
      role="img"
      aria-label={`${done} of ${total} checks done`}
      data-testid="health-progress"
    >
      <circle cx="46" cy="46" r="38" fill="none" stroke="#22262d" strokeWidth="10" />
      <circle
        cx="46"
        cy="46"
        r="38"
        fill="none"
        opacity={done > 0 ? 1 : 0}
        stroke="#c6ff3d"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 46 46)"
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
      <text x="46" y="52" textAnchor="middle" fontFamily="Geist Mono Variable, monospace" fontSize="18" fill="#f2f4f0">
        {done}/{total}
      </text>
    </svg>
  )
}
