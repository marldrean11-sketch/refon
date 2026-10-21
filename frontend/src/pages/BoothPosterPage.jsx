import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Maximize2, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { LogoGlyph } from '../components/ui/BrandMark.jsx'
import { SITE_INFO, boothLabel } from '../content/site-info.js'
import { useSiteSettings } from '../lib/site-settings.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

/** Loops scattered behind the poster, in the grade colours: lime A, amber B, coral C. */
const LOOPS = [
  { left: '7mm', top: '62mm', size: '15mm', rotate: -12, color: '#c6ff3d', opacity: 0.75 },
  { left: '178mm', top: '50mm', size: '12mm', rotate: 14, color: '#ffb547', opacity: 0.85 },
  { left: '181mm', top: '160mm', size: '16mm', rotate: -8, color: '#ff7a5c', opacity: 0.8 },
  { left: '14mm', top: '178mm', size: '11mm', rotate: 18, color: '#ffb547', opacity: 0.7 },
  { left: '24mm', top: '120mm', size: '8mm', rotate: -20, color: '#ff7a5c', opacity: 0.55 },
  { left: '166mm', top: '226mm', size: '9mm', rotate: 10, color: '#c6ff3d', opacity: 0.55 },
]

const GRADES = [
  { id: 'A', label: 'Excellent', color: '#c6ff3d', soft: '#1f2a0e' },
  { id: 'B', label: 'Very good', color: '#ffb547', soft: '#33240a' },
  { id: 'C', label: 'Good', color: '#ff7a5c', soft: '#3a1a12' },
]

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

/**
 * The printable booth poster: one A4 page in the website's dark neon look.
 *
 * The headline is the ReFon tagline. The main QR code sits on the screen of a
 * big glowing phone outline and opens the phone health check; a small one opens
 * the feedback form. The QR codes always point at the hosted address in
 * `site-info.js`, never at the current origin, so a poster printed from a laptop
 * running locally still works for visitors' phones.
 *
 * The page forces background printing (`print-color-adjust: exact`), so the
 * dark background prints without the "Background graphics" option.
 */
export function BoothPosterPage() {
  const { booth } = useSiteSettings()
  const target = `${SITE_INFO.url}${MARKETPLACE_ROUTES.healthCheck}`
  const feedbackTarget = `${SITE_INFO.url}${MARKETPLACE_ROUTES.feedback}`
  const svg = useQrSvg(target)
  const feedbackSvg = useQrSvg(feedbackTarget)

  return (
    <div className="min-h-screen bg-page px-4 py-8 print:p-0">
      <style>
        {'@page { size: A4; margin: 0 } @media print { html, body { margin: 0; padding: 0; background: #0a0b0d } }'}
      </style>

      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={MARKETPLACE_ROUTES.home}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to ReFon
        </Link>
        <button
          type="button"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
          Full screen
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-page hover:bg-accent-hover"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print poster
        </button>
        <p className="w-full text-xs text-muted">
          Print on A4, colour, scale 100% (&ldquo;Actual size&rdquo;). Glossy paper makes the black and lime pop.
        </p>
      </div>

      <article
        data-testid="booth-poster"
        className="relative mx-auto h-[297mm] w-[210mm] max-w-full overflow-hidden bg-[#0a0b0d] text-[#f2f4f0] shadow-2xl [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none"
      >
        {/* Neon grid floor, fading upward. */}
        <div
          aria-hidden="true"
          className="absolute -left-[50mm] -right-[50mm] bottom-[-10mm] h-[110mm] origin-bottom [transform:perspective(130mm)_rotateX(62deg)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(198,255,61,.32) 0.4mm, transparent 0.4mm), linear-gradient(90deg, rgba(198,255,61,.32) 0.4mm, transparent 0.4mm)',
            backgroundSize: '14mm 14mm',
            maskImage: 'linear-gradient(to top, #000 30%, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, #000 30%, transparent)',
          }}
        />
        {/* Lime glow behind the phone. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(95mm 120mm at 50% 66%, rgba(198,255,61,.17), transparent 70%)' }}
        />
        {LOOPS.map((loop) => (
          <span
            key={`${loop.left}-${loop.top}`}
            aria-hidden="true"
            className="absolute"
            style={{
              left: loop.left,
              top: loop.top,
              width: loop.size,
              height: loop.size,
              color: loop.color,
              opacity: loop.opacity,
              transform: `rotate(${loop.rotate}deg)`,
            }}
          >
            <LogoGlyph tile={false} draw={false} className="block size-full" />
          </span>
        ))}

        <div className="relative px-[14mm] pt-[13mm]">
          <header className="flex items-center gap-[3.5mm]">
            <LogoGlyph className="size-[15mm]" draw={false} />
            <span className="font-display text-[38px] font-extrabold tracking-[-0.045em]">
              re<span className="text-[#c6ff3d]">fon</span>
            </span>
            <span className="ml-auto rounded-full border-[0.4mm] border-[#3a3f48] px-[4mm] py-[2mm] font-mono text-[12px] uppercase tracking-[0.12em] text-[#b9bec4]">
              {boothLabel(booth)}
            </span>
          </header>

          <p className="mt-[11mm] font-mono text-[14px] uppercase tracking-[0.14em] text-[#c6ff3d]">
            Pre-loved phones · tested in the open
          </p>
          <h1 className="mt-[3mm] font-display text-[86px] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#f2f4f0]">
            Sulit na,
            <br />
            <span className="text-[#c6ff3d]">legit pa.</span>
          </h1>
          <p className="mt-[5mm] max-w-[150mm] text-[21px] leading-snug text-[#b9bec4]">
            Libre: test the phone in your hand in 2 minutes. Screen, speaker, mic,
            cameras and sensors. Scan the phone below.
          </p>
        </div>

        {/* The big phone: its screen is the QR code to the health check. */}
        <div className="absolute left-1/2 top-[132mm] h-[128mm] w-[76mm] -translate-x-1/2 rounded-[13mm] border-[2.6mm] border-[#c6ff3d] bg-[#121418] shadow-[0_0_0_1mm_rgba(198,255,61,.18),0_0_22mm_4mm_rgba(198,255,61,.35)]">
          <span className="absolute left-1/2 top-[3.5mm] h-[5mm] w-[22mm] -translate-x-1/2 rounded-full bg-[#0a0b0d]" />
          <div className="absolute inset-x-[6mm] top-[15mm] rounded-[5mm] bg-[#ffffff] p-[4mm]">
            <div
              className="aspect-square w-full [&>svg]:size-full"
              role="img"
              aria-label="QR code that opens the ReFon phone health check"
              // Generated locally by `qrcode` from the site's own address.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
          <p className="absolute inset-x-0 top-[89mm] text-center font-display text-[19px] font-extrabold tracking-[-0.03em] text-[#f2f4f0]">
            Check mo muna.
          </p>
          <p className="absolute inset-x-0 top-[97mm] text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#c6ff3d]">
            Scan · free health check
          </p>
          <span className="absolute bottom-[6mm] left-1/2 size-[10mm] -translate-x-1/2 rounded-full border-[0.6mm] border-[#c6ff3d]" />
        </div>
        <p className="absolute inset-x-0 top-[263mm] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#9ba1a8]">
          {target.replace(/^https?:\/\//, '')}
        </p>

        <footer className="absolute inset-x-[14mm] bottom-[11mm] flex items-end gap-[4mm]">
          <div className="flex flex-col gap-[2mm]">
            {GRADES.map((grade) => (
              <span
                key={grade.id}
                className="inline-flex w-fit items-center gap-[2mm] rounded-[1.6mm] py-[1.2mm] pl-[1.2mm] pr-[2.5mm] font-mono text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ background: grade.soft, color: grade.color, boxShadow: `inset 0 0 0 0.25mm ${grade.color}66` }}
              >
                <b
                  className="grid size-[5mm] place-items-center rounded-[1mm] text-[11px] text-[#0a0b0d]"
                  style={{ background: grade.color }}
                >
                  {grade.id}
                </b>
                {grade.label}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-[3mm]" data-testid="poster-feedback-qr">
            <div className="text-right">
              <p className="font-display text-[16px] font-bold">Rate us!</p>
              <p className="text-[11px] leading-snug text-[#9ba1a8]">Kumusta ang ReFon?
                <br />20 seconds.</p>
            </div>
            <div
              className="size-[22mm] shrink-0 rounded-[2.5mm] bg-[#ffffff] p-[1.5mm] [&>svg]:size-full"
              role="img"
              aria-label="QR code that opens the ReFon feedback form"
              dangerouslySetInnerHTML={{ __html: feedbackSvg }}
            />
          </div>
        </footer>
        <p className="absolute inset-x-0 bottom-[4mm] text-center text-[10px] text-[#9ba1a8]">
          {SITE_INFO.credits}
        </p>
      </article>
    </div>
  )
}
