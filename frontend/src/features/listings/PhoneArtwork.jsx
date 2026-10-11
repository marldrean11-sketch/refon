import { ImageIcon } from 'lucide-react'

/**
 * Device artwork used when a listing has no real photograph yet.
 *
 * Every ReFon phone needs to look distinct on a results page even before the
 * seller has uploaded photos, so this renders a device silhouette tinted by the
 * actual listing colour. When real photos arrive, the card renders an `<img>`
 * instead and this is never used.
 */

/**
 * The backdrop behind each brand's illustration: dark, with a faint tint of the
 * brand so a grid of cards is not one flat colour. The device body carries the
 * listing's real colour on top of it.
 */
const BRAND_SURFACES = {
  Apple: { from: '#1e2228', via: '#191c21', to: '#121418', glow: 'rgba(198,255,61,0.12)' },
  Samsung: { from: '#1a2030', via: '#171b25', to: '#121418', glow: 'rgba(96,140,255,0.16)' },
  Google: { from: '#1f1d2a', via: '#191a22', to: '#121418', glow: 'rgba(150,130,255,0.16)' },
  Xiaomi: { from: '#2a2019', via: '#1f1b18', to: '#121418', glow: 'rgba(255,165,38,0.14)' },
  Oppo: { from: '#17241f', via: '#161e1b', to: '#121418', glow: 'rgba(61,255,170,0.12)' },
  Vivo: { from: '#172330', via: '#151c24', to: '#121418', glow: 'rgba(61,200,255,0.14)' },
  OnePlus: { from: '#2a1a1a', via: '#201819', to: '#121418', glow: 'rgba(255,107,92,0.14)' },
  Realme: { from: '#29241a', via: '#1f1d18', to: '#121418', glow: 'rgba(255,200,61,0.14)' },
  Nokia: { from: '#1d2126', via: '#181b20', to: '#121418', glow: 'rgba(180,190,200,0.12)' },
  Huawei: { from: '#2a1d17', via: '#201a17', to: '#121418', glow: 'rgba(255,122,92,0.14)' },
}

const DEFAULT_SURFACE = {
  from: '#1e2228',
  via: '#191c21',
  to: '#121418',
  glow: 'rgba(198,255,61,0.1)',
}

/** Maps the free-text colour on a listing to a real device body colour. */
const COLOR_BODIES = {
  midnight: { body: ['#2f3640', '#111827'], trim: '#1f2937' },
  black: { body: ['#3f3f46', '#18181b'], trim: '#27272a' },
  space: { body: ['#4b5563', '#1f2937'], trim: '#374151' },
  graphite: { body: ['#52525b', '#27272a'], trim: '#3f3f46' },
  gray: { body: ['#9ca3af', '#4b5563'], trim: '#6b7280' },
  grey: { body: ['#9ca3af', '#4b5563'], trim: '#6b7280' },
  silver: { body: ['#e5e7eb', '#9ca3af'], trim: '#d1d5db' },
  white: { body: ['#f8fafc', '#e2e8f0'], trim: '#f1f5f9' },
  starlight: { body: ['#f5f3ef', '#dcd6cd'], trim: '#e7e2da' },
  rose: { body: ['#f9c8d4', '#e8859c'], trim: '#f3aebd' },
  gold: { body: ['#f5dfa8', '#c9a34e'], trim: '#e0c377' },
  blue: { body: ['#7dd3fc', '#2563eb'], trim: '#60a5fa' },
  iceblue: { body: ['#c7e2f7', '#7fb2d8'], trim: '#a5cfe9' },
  onyx: { body: ['#3b3b41', '#131316'], trim: '#26262b' },
  phantom: { body: ['#3f3f46', '#111113'], trim: '#27272a' },
  awesome: { body: ['#dbeafe', '#93c5fd'], trim: '#bfdbfe' },
  celestial: { body: ['#4c1d95', '#1e1b4b'], trim: '#5b21b6' },
  awesomepearl: { body: ['#fdf4ff', '#f5d0fe'], trim: '#fae8ff' },
  green: { body: ['#a7f3d0', '#059669'], trim: '#34d399' },
  violet: { body: ['#ddd6fe', '#7c3aed'], trim: '#a78bfa' },
  purple: { body: ['#ddd6fe', '#6d28d9'], trim: '#a78bfa' },
  red: { body: ['#fecaca', '#b91c1c'], trim: '#f87171' },
  yellow: { body: ['#fef08a', '#ca8a04'], trim: '#fde047' },
  orange: { body: ['#fed7aa', '#ea580c'], trim: '#fb923c' },
  coral: { body: ['#fed7aa', '#f97316'], trim: '#fdba74' },
  teal: { body: ['#99f6e4', '#0f766e'], trim: '#5eead4' },
  midnightblue: { body: ['#1e3a8a', '#0c1a3a'], trim: '#1d4ed8' },
  titan: { body: ['#8f9aa8', '#3c4653'], trim: '#6b7684' },
}

const DEFAULT_BODY = { body: ['#94a3b8', '#334155'], trim: '#64748b' }

/**
 * Camera layout families. Roughly how many lenses the model has and how they
 * are arranged, which is what makes two phones look different at card size.
 */
const CAMERA_LAYOUTS = {
  square: { lenses: 2, columns: 2, label: 'square' },
  vertical: { lenses: 2, columns: 1, label: 'vertical' },
  triple: { lenses: 3, columns: 3, label: 'triple' },
  'triple-vertical': { lenses: 3, columns: 3, label: 'triple vertical' },
  quad: { lenses: 4, columns: 2, label: 'quad' },
}

function cameraLayoutFor(model) {
  const text = String(model ?? '').toLowerCase()

  if (/pro max|ultra|note 12 ultra/.test(text)) {
    return CAMERA_LAYOUTS.quad
  }

  if (/pro/.test(text)) {
    return CAMERA_LAYOUTS.triple
  }

  if (/\b(13|14|15|16|17)\b/.test(text) || /galaxy s2[2-4]/.test(text)) {
    return CAMERA_LAYOUTS['triple-vertical']
  }

  if (/pixel/.test(text)) {
    return CAMERA_LAYOUTS.vertical
  }

  if (/galaxy s2[1-9]/.test(text)) {
    return CAMERA_LAYOUTS.triple
  }

  return CAMERA_LAYOUTS.square
}

/** Notch family, so a 2015 iPhone and a 2021 iPhone are visibly different. */
function frameFamilyFor(model, brand) {
  const text = String(model ?? '').toLowerCase()
  const yearHint = text.match(/(?:iphone\s*)?(\d{2})/)

  if (brand === 'Apple') {
    const number = Number(text.match(/iphone\s*(\d{1,2})/)?.[1])

    if (Number.isFinite(number)) {
      if (number >= 14) return { notch: 'island', corners: 'rounded-xl', rails: 'flat' }
      if (number >= 11) return { notch: 'notch', corners: 'rounded-lg', rails: 'flat' }
      if (number >= 7) return { notch: 'circle', corners: 'rounded-md', rails: 'round' }
      return { notch: 'bar', corners: 'rounded-sm', rails: 'round' }
    }
  }

  if (/pixel|pixel/.test(text)) {
    return { notch: 'punch', corners: 'rounded-2xl', rails: 'flat' }
  }

  if (yearHint) {
    return { notch: 'punch', corners: 'rounded-2xl', rails: 'flat' }
  }

  return { notch: 'punch', corners: 'rounded-xl', rails: 'flat' }
}

function resolveBody(color) {
  const text = String(color ?? '').toLowerCase()

  for (const [key, value] of Object.entries(COLOR_BODIES)) {
    if (text.includes(key)) {
      return value
    }
  }

  return DEFAULT_BODY
}

function Notch({ kind }) {
  if (kind === 'island') {
    return (
      <div className="absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-pill bg-black/80" aria-hidden="true" />
    )
  }

  if (kind === 'notch') {
    return (
      <div className="absolute left-1/2 top-1.5 h-4 w-12 -translate-x-1/2 rounded-b-xl bg-black/80" aria-hidden="true" />
    )
  }

  if (kind === 'circle') {
    return <div className="absolute left-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full bg-black/70" aria-hidden="true" />
  }

  if (kind === 'punch') {
    return <div className="absolute left-1/2 top-2 size-2 -translate-x-1/2 rounded-full bg-black/75" aria-hidden="true" />
  }

  return <div className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-pill bg-black/40" aria-hidden="true" />
}

function CameraCluster({ layout, trim }) {
  const columns = layout.columns
  const rows = Math.ceil(layout.lenses / columns)

  return (
    <div
      className="absolute right-2.5 top-2.5 rounded-xl p-1.5 shadow-sm"
      style={{
        background: `linear-gradient(150deg, ${trim}, rgba(0,0,0,0.55))`,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 4,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: layout.lenses }, (_, index) => (
        <span
          key={index}
          className="size-3 rounded-full ring-1 ring-white/25"
          style={{
            background: `radial-gradient(circle at 32% 30%, ${trim}, #05070a 68%)`,
            gridRow: Math.floor(index / columns) + 1,
            gridColumn: (index % columns) + 1,
            aspectRatio: '1 / 1',
            height: rows > 1 ? undefined : 12,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Renders a model-specific device illustration.
 *
 * `view` changes the pose and the on-screen content so a gallery can show
 * front, back, screen, and detail angles without four external images.
 */
export function PhoneArtwork({
  brand,
  model,
  color,
  view = 'default',
  batteryPercent,
  className = 'aspect-[4/3]',
  showLabel = true,
  showColor = true,
}) {
  const surface = BRAND_SURFACES[brand] ?? DEFAULT_SURFACE
  const body = resolveBody(color)
  const layout = cameraLayoutFor(model)
  const frame = frameFamilyFor(model, brand)

  const isBack = view === 'detail' || view === 'angle'
  const isScreen = view === 'screen'
  const isAngle = view === 'angle'

  // The screen view shows the battery reading on screen. It must be this device's
  // actual figure, not a placeholder: a hard-coded number on a product page would
  // be a claim about a specific phone that is not true. When the caller does not
  // supply one, the screen renders the device's identity mark instead of a
  // battery claim.
  const hasBatteryReading = Number.isFinite(Number(batteryPercent))
  const screenBattery = hasBatteryReading ? Math.min(100, Math.max(0, Number(batteryPercent))) : null

  const rotation = isAngle ? 'rotate-[-8deg]' : view === 'front' ? 'rotate-[-2deg]' : ''
  const tilt = view === 'detail' ? 'rotate-[6deg]' : ''

  // The device is sized from its height and locked to a real handset ratio
  // rather than from a percentage width. A fixed width meant the same drawing
  // filled a 4:3 frame and shrank to nothing in a 4:5 one, which is the
  // difference between a card that shows the product and one that shows a
  // background with a phone somewhere in it.
  const deviceShell = [
    'relative h-[78%] w-auto max-w-[48%] rounded-[1.6rem] p-[3px] shadow-2xl transition-transform duration-300 motion-reduce:transform-none',
    frame.corners,
    rotation,
    tilt,
  ]
    .filter(Boolean)
    .join(' ')

  const screenClasses = [
    'relative h-full w-full overflow-hidden bg-gradient-to-b',
    frame.corners,
  ].join(' ')

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(140deg, ${surface.from} 0%, ${surface.via} 52%, ${surface.to} 100%)`,
      }}
      role="img"
      aria-label={`${brand} ${model} in ${color ?? 'as pictured'}, ${view} illustration`}
    >
      <div
        className="absolute -right-12 -top-14 size-48 rounded-full blur-3xl"
        style={{ background: surface.glow }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(rgba(110,110,100,0.55) 0.6px, transparent 0.6px)',
          backgroundSize: '13px 13px',
        }}
        aria-hidden="true"
      />

      {showLabel && (
        /* `z-10` is load-bearing. The device body below is painted after this
           chip in DOM order and reaches up past it, so without an explicit
           stacking order the device's shoulder covers the first few characters
           and the label reads "STRATION". Opaque ink rather than a translucent
           surface, because the backdrop is a coloured gradient and a 90%-white
           chip vanishes wherever that gradient is light. */
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-control bg-ink/95 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          <ImageIcon className="size-3" aria-hidden="true" />
          Illustration
        </span>
      )}

      <div className="absolute inset-0 grid place-items-center">
        <div
          className={deviceShell}
          style={{
            aspectRatio: '1 / 2.05',
            background: `linear-gradient(160deg, ${body.trim}, rgba(255,255,255,0.28), ${body.trim})`,
          }}
          aria-hidden="true"
        >
          <div
            className={`h-full w-full border-[3px] border-black/85 ${
              isBack ? 'opacity-100' : 'opacity-95'
            }`}
            style={{
              borderRadius: 'inherit',
              background: isBack
                ? `linear-gradient(155deg, ${body.body[0]}, ${body.body[1]})`
                : `linear-gradient(180deg, ${body.body[1]}, #05070a)`,
            }}
          >
            {isBack ? (
              <>
                <CameraCluster layout={layout} trim={body.trim} />
                <div className="absolute bottom-3 left-1/2 h-[38%] w-[22%] -translate-x-1/2 rounded-[45%] border border-white/10" />
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-[0.2em] text-chalk/45">
                  {brand}
                </span>
              </>
            ) : (
              <>
                <Notch kind={frame.notch} />
                {isScreen ? (
                  <ScreenContent batteryPercent={screenBattery} brand={brand} />
                ) : (
                  <div
                    className="grid h-full place-items-center"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.22), transparent 62%)',
                    }}
                  >
                    <span
                      className="font-display text-3xl font-bold tracking-tight"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {brandLabelInitials(brand)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showColor && color && (
        <span className="absolute bottom-3 right-3 rounded-sm bg-surface/90 px-2 py-1 font-mono text-[10px] font-medium text-muted ring-1 ring-inset ring-line-2 backdrop-blur">
          {color}
        </span>
      )}
    </div>
  )
}

function ScreenContent({ batteryPercent, brand }) {
  return (
    <div className="flex h-full flex-col justify-between p-2.5" aria-hidden="true">
      <div>
        {batteryPercent != null ? (
          <>
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-chalk/55">
              Battery health
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none text-chalk">
              {batteryPercent}%
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-chalk/20">
              <div
                className="h-full rounded-[2px] bg-accent-300"
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-chalk/55">
              Tested device
            </p>
            <p className="font-display text-lg font-bold leading-none text-chalk">
              {brandLabelInitials(brand)}
            </p>
          </>
        )}
      </div>
      <div className="flex items-end gap-1">
        {[38, 62, 88, 100].map((height) => (
          <span
            key={height}
            className="flex-1 rounded-t-sm bg-chalk/35"
            style={{ height: `${height * 0.24}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function brandLabelInitials(brand) {
  const text = String(brand ?? '')
  return text === 'Samsung' ? 'S' : text.charAt(0) || 'R'
}
