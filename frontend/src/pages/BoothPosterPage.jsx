import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { LogoGlyph } from '../components/ui/BrandMark.jsx'
import { SITE_INFO, boothLabel } from '../content/site-info.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

const STEPS = [
  { n: '01', title: 'Scan', body: 'Point your camera at the code. No app needed.' },
  { n: '02', title: 'Test', body: 'Screen, touch, speaker, mic, cameras and sensors in 2 minutes.' },
  { n: '03', title: 'Estimate', body: 'See what your phone could be worth on trade-in.' },
]

/**
 * The printable booth poster: one A4 page with a big QR code to the phone
 * health check on the public site, three steps, and the team credit.
 *
 * It prints on white so a school printer copes, with the lime as the only
 * colour. The QR always points at the hosted address in `site-info.js`, never at
 * the current origin, so a poster printed from a laptop running locally still
 * works for visitors' phones.
 */
/** An SVG QR code for `target`, drawn locally by `qrcode`. Empty until ready. */
function useQrSvg(target) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let cancelled = false
    QRCode.toString(target, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'H',
      color: { dark: '#0a0b0d', light: '#ffffff' },
    })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [target])

  return svg
}

export function BoothPosterPage() {
  const target = `${SITE_INFO.url}${MARKETPLACE_ROUTES.healthCheck}`
  const feedbackTarget = `${SITE_INFO.url}${MARKETPLACE_ROUTES.feedback}`
  const svg = useQrSvg(target)
  const feedbackSvg = useQrSvg(feedbackTarget)

  return (
    <div className="min-h-screen bg-page px-4 py-8 print:bg-white print:p-0">
      <style>{'@page { size: A4; margin: 0 } @media print { body { background: #fff } }'}</style>

      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={MARKETPLACE_ROUTES.home}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to ReFon
        </Link>
        <Link
          to={MARKETPLACE_ROUTES.kiosk}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent"
        >
          Big-screen mode
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-page hover:bg-accent-hover"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print poster
        </button>
      </div>

      <article
        data-testid="booth-poster"
        className="mx-auto flex h-[297mm] w-[210mm] max-w-full flex-col overflow-hidden bg-[#ffffff] px-[16mm] py-[16mm] text-[#0a0b0d] shadow-2xl print:shadow-none"
      >
        <header className="flex items-center gap-3">
          <LogoGlyph className="size-14" draw={false} />
          <span className="font-display text-[34px] font-extrabold tracking-[-0.04em]">
            re<span className="rounded-md bg-[#c6ff3d] px-1">fon</span>
          </span>
          <span className="ml-auto rounded-full border-2 border-[#0a0b0d] px-4 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.1em]">
            {boothLabel()}
          </span>
        </header>

        <h1 className="mt-[12mm] font-display text-[64px] font-extrabold leading-[1] tracking-[-0.04em] text-[#0a0b0d]">
          Check mo muna.
        </h1>
        <p className="mt-4 max-w-[150mm] text-[22px] leading-snug">
          Test the phone in your hand, free, right here at the booth. Then see what it&rsquo;s worth.
        </p>

        <div className="mt-[10mm] flex flex-1 items-center justify-center">
          <div className="rounded-[28px] border-[6px] border-[#c6ff3d] bg-[#ffffff] p-[8mm]">
            <div
              className="size-[85mm] [&>svg]:size-full"
              role="img"
              aria-label="QR code that opens the ReFon phone health check"
              // Generated locally by `qrcode` from the site's own address.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
        <p className="mt-3 text-center font-mono text-[15px]">{target.replace(/^https?:\/\//, '')}</p>

        <ol className="mt-[8mm] grid grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-2xl border-2 border-[#0a0b0d] p-4">
              <span className="rounded-full bg-[#c6ff3d] px-2.5 py-0.5 font-mono text-[13px] font-semibold">{step.n}</span>
              <p className="mt-3 font-display text-[20px] font-bold text-[#0a0b0d]">{step.title}</p>
              <p className="mt-1 text-[14px] leading-snug">{step.body}</p>
            </li>
          ))}
        </ol>

        <footer className="mt-[8mm] flex items-center justify-between gap-4 border-t-2 border-[#0a0b0d] pt-4 text-[13px]">
          <div className="flex items-center gap-3" data-testid="poster-feedback-qr">
            <div
              className="size-[22mm] shrink-0 [&>svg]:size-full"
              role="img"
              aria-label="QR code that opens the ReFon feedback form"
              dangerouslySetInnerHTML={{ __html: feedbackSvg }}
            />
            <div>
              <p className="font-display text-[16px] font-bold">Rate us!</p>
              <p className="leading-snug">Kumusta ang ReFon? Tell us in 30 seconds.</p>
              <p className="mt-0.5 font-semibold">Sulit na, legit pa.</p>
            </div>
          </div>
          <span className="max-w-[80mm] text-right">{SITE_INFO.credits}</span>
        </footer>
      </article>
    </div>
  )
}
