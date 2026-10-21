import QRCode from 'qrcode'
import { CHECK_STATUS, HEALTH_CHECKS } from './health-checks.js'
import { SITE_INFO, boothLabel } from '../../content/site-info.js'
import { getSiteSettings } from '../../lib/site-settings.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

const W = 1080
const H = 1350
const COLORS = {
  page: '#0a0b0d',
  card: '#14161a',
  line: '#2a2d33',
  chalk: '#f2f4f0',
  muted: '#9ca3a0',
  accent: '#c6ff3d',
  danger: '#ff6b5c',
}
const DISPLAY = '"Unbounded Variable", "Unbounded", system-ui, sans-serif'
const BODY = '"Geist Variable", "Geist", system-ui, sans-serif'
const MONO = '"Geist Mono Variable", "Geist Mono", ui-monospace, monospace'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawQr(ctx, text, x, y, size) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const quiet = 2
  const cell = size / (modules.size + quiet * 2)
  ctx.fillStyle = COLORS.chalk
  roundRect(ctx, x, y, size, size, 16)
  ctx.fill()
  ctx.fillStyle = COLORS.page
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) {
        ctx.fillRect(
          Math.floor(x + (col + quiet) * cell),
          Math.floor(y + (row + quiet) * cell),
          Math.ceil(cell),
          Math.ceil(cell),
        )
      }
    }
  }
}

/**
 * Draws the shareable result card: score, every check with its outcome, and a
 * QR code back to the health check, sized for a phone story or a chat photo.
 */
export async function drawShareCard(results) {
  try {
    await Promise.all([
      document.fonts.load(`800 80px ${DISPLAY}`),
      document.fonts.load(`500 32px ${BODY}`),
      document.fonts.load(`500 24px ${MONO}`),
    ])
  } catch {
    // Fonts are a nicety; the system fallback still draws a readable card.
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const values = Object.values(results)
  const passed = values.filter((result) => result.status === 'passed').length
  const failed = values.filter((result) => result.status === 'failed').length
  const total = HEALTH_CHECKS.length

  // Background with a soft lime glow in the corner.
  ctx.fillStyle = COLORS.page
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W - 120, 120, 0, W - 120, 120, 620)
  glow.addColorStop(0, 'rgba(198, 255, 61, 0.22)')
  glow.addColorStop(1, 'rgba(198, 255, 61, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  const left = 80
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = COLORS.accent
  ctx.font = `600 28px ${MONO}`
  ctx.fillText('REFON · PHONE HEALTH CHECK', left, 130)

  ctx.fillStyle = COLORS.chalk
  ctx.font = `800 76px ${DISPLAY}`
  ctx.fillText(failed === 0 && passed === total ? 'Ayos! All clear.' : 'My phone checkup', left, 230)

  // The score.
  ctx.fillStyle = COLORS.accent
  ctx.font = `800 200px ${DISPLAY}`
  const score = `${passed}/${total}`
  ctx.fillText(score, left - 6, 460)
  const scoreWidth = ctx.measureText(score).width
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 36px ${BODY}`
  ctx.fillText('checks passed', left + scoreWidth + 24, 400)
  if (failed > 0) {
    ctx.fillStyle = COLORS.danger
    ctx.fillText(`${failed} with a problem`, left + scoreWidth + 24, 450)
  }

  // Every check, two columns.
  const top = 530
  const cardHeight = 470
  ctx.fillStyle = COLORS.card
  roundRect(ctx, left - 20, top, W - (left - 20) * 2, cardHeight, 32)
  ctx.fill()
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.stroke()

  const colWidth = (W - left * 2) / 2
  HEALTH_CHECKS.forEach((check, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = left + 20 + col * colWidth
    const y = top + 80 + row * 105
    const status = results[check.id]?.status ?? 'idle'
    const tone = status === 'passed' ? COLORS.accent : status === 'failed' ? COLORS.danger : COLORS.line
    const mark = status === 'passed' ? '✓' : status === 'failed' ? '!' : '–'

    ctx.fillStyle = tone
    ctx.beginPath()
    ctx.arc(x + 22, y - 12, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = status === 'passed' || status === 'failed' ? COLORS.page : COLORS.muted
    ctx.font = `700 26px ${BODY}`
    ctx.textAlign = 'center'
    ctx.fillText(mark, x + 22, y - 3)
    ctx.textAlign = 'left'

    ctx.fillStyle = status === 'idle' ? COLORS.muted : COLORS.chalk
    ctx.font = `500 34px ${BODY}`
    ctx.fillText(check.label, x + 62, y)
  })

  // Footer: where to run it yourself.
  const qrSize = 210
  const qrY = H - qrSize - 70
  const url = `${SITE_INFO.url}${MARKETPLACE_ROUTES.healthCheck}`
  drawQr(ctx, url, W - left - qrSize, qrY, qrSize)

  ctx.fillStyle = COLORS.chalk
  ctx.font = `800 44px ${DISPLAY}`
  ctx.fillText('Check yours too.', left, qrY + 70)
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 30px ${BODY}`
  ctx.fillText('Free, in your browser. Scan the code.', left, qrY + 120)
  ctx.fillStyle = COLORS.accent
  ctx.font = `600 26px ${MONO}`
  ctx.fillText(boothLabel(getSiteSettings().booth).toUpperCase(), left, qrY + 175)
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 22px ${MONO}`
  ctx.fillText(new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' }), left, qrY + 210)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not draw the card.'))), 'image/png')
  })
}

const CARD_FILE_NAME = 'refon-health-check.png'

function cardFile(blob) {
  return new File([blob], CARD_FILE_NAME, { type: 'image/png' })
}

/** Whether this browser's share sheet can take the card as a file. */
export function canShareCard(blob) {
  return Boolean(navigator.canShare?.({ files: [cardFile(blob)] }))
}

/**
 * Opens the phone's share sheet with the card. Resolves to 'shared' or
 * 'cancelled'; throws when the browser refuses.
 */
export async function shareCard(blob) {
  try {
    await navigator.share({
      files: [cardFile(blob)],
      title: 'My ReFon phone health check',
      text: `I checked my phone on ReFon. Try it: ${SITE_INFO.url}${MARKETPLACE_ROUTES.healthCheck}`,
    })
    return 'shared'
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled'
    throw error
  }
}

/** Saves the card as a PNG through an ordinary download link. */
export function downloadCard(href) {
  const link = document.createElement('a')
  link.href = href
  link.download = CARD_FILE_NAME
  document.body.append(link)
  link.click()
  link.remove()
}

/**
 * Messenger, Facebook, Instagram and similar apps open links in their own
 * browser, which ignores downloads and cannot save images the page made.
 */
export function isInAppBrowser(userAgent = navigator.userAgent) {
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|MicroMessenger|Line\/|musical_ly|TikTok/i.test(
    userAgent,
  )
}

export function isAndroid(userAgent = navigator.userAgent) {
  return /Android/i.test(userAgent)
}

/** The search param that carries results into another browser. */
export const RESULTS_PARAM = 'card'

/** Packs results as `display:passed,touch:failed` for a URL; notes are dropped. */
export function encodeResults(results) {
  return HEALTH_CHECKS.filter((check) => results[check.id])
    .map((check) => `${check.id}:${results[check.id].status}`)
    .join(',')
}

/** Reads results back from `encodeResults`, ignoring anything it does not know. */
export function decodeResults(value) {
  const ids = new Set(HEALTH_CHECKS.map((check) => check.id))
  const results = {}
  for (const pair of (value ?? '').split(',')) {
    const [id, status] = pair.split(':')
    if (ids.has(id) && status !== 'idle' && CHECK_STATUS[status]) results[id] = { status }
  }
  return results
}

/**
 * An Android link that reopens this page in Chrome with the results attached,
 * falling back to the default browser when Chrome is not installed.
 */
export function chromeIntentUrl(results, location = window.location) {
  const url = new URL(MARKETPLACE_ROUTES.healthCheck, location.origin)
  url.searchParams.set(RESULTS_PARAM, encodeResults(results))
  const fallback = encodeURIComponent(url.href)
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}
