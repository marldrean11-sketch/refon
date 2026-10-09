/**
 * The self-test a visitor runs on the phone in their hand.
 *
 * Each entry is one thing a web browser can genuinely reach. Where a test lines up
 * with one of ReFon's 11 inspection checks, `inspectionId` names it, so the report
 * can say which part of the inspection a buyer just reproduced on their own.
 *
 * What is deliberately absent: battery *health* (no browser exposes it — only the
 * charge level, on some Android browsers), biometrics, Bluetooth, the physical
 * buttons, and IMEI. The page says so rather than pretending to test them.
 */
export const HEALTH_CHECKS = Object.freeze([
  {
    id: 'display',
    label: 'Display',
    inspectionId: 'display',
    summary: 'Full-screen colours to spot dead or stuck pixels and burn-in.',
  },
  {
    id: 'touch',
    label: 'Touchscreen',
    inspectionId: 'touchscreen',
    summary: 'Drag across every tile to find areas that ignore your finger.',
  },
  {
    id: 'speaker',
    label: 'Speaker',
    inspectionId: 'speaker',
    summary: 'Plays a short tone through the loudspeaker.',
  },
  {
    id: 'microphone',
    label: 'Microphone',
    inspectionId: 'microphone',
    summary: 'Listens for your voice and shows the level as you speak.',
  },
  {
    id: 'camera',
    label: 'Cameras',
    inspectionId: 'camera',
    summary: 'Opens each camera so you can check focus and the lens glass.',
  },
  {
    id: 'vibration',
    label: 'Vibration',
    inspectionId: null,
    summary: 'Runs the vibration motor in a short pattern.',
  },
  {
    id: 'motion',
    label: 'Motion sensors',
    inspectionId: null,
    summary: 'Reads the accelerometer and gyroscope while you tilt the phone.',
  },
  {
    id: 'battery',
    label: 'Battery',
    inspectionId: 'battery',
    summary: 'Reads the charge level and whether it is charging.',
  },
])

/** Every state a test can be in. Only `passed` is green. */
export const CHECK_STATUS = Object.freeze({
  idle: { label: 'Not run', tone: 'neutral' },
  passed: { label: 'Passed', tone: 'accent' },
  failed: { label: 'Problem found', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  unsupported: { label: "Browser can't test", tone: 'neutral' },
  blocked: { label: 'Permission denied', tone: 'flare' },
})

/**
 * The browser features each test depends on, checked without asking for any
 * permission. A test that is unsupported is offered as such instead of failing,
 * because a missing API says something about the browser, not the phone.
 */
export function detectSupport() {
  if (typeof window === 'undefined') {
    return {}
  }

  const media = Boolean(navigator.mediaDevices?.getUserMedia)

  return {
    display: true,
    touch: true,
    speaker: Boolean(window.AudioContext || window.webkitAudioContext),
    microphone: media,
    camera: media,
    vibration: typeof navigator.vibrate === 'function',
    motion: typeof window.DeviceMotionEvent !== 'undefined',
    battery: typeof navigator.getBattery === 'function',
  }
}

/** Facts the browser volunteers about the device, with no test to run. */
export function readDeviceFacts() {
  if (typeof window === 'undefined') {
    return []
  }

  const dpr = window.devicePixelRatio || 1
  const facts = [
    {
      label: 'Screen',
      value: `${Math.round(window.screen.width * dpr)} × ${Math.round(window.screen.height * dpr)} px`,
    },
    { label: 'Pixel density', value: `${dpr.toFixed(dpr % 1 === 0 ? 0 : 2)}×` },
    {
      label: 'Touch points',
      value: navigator.maxTouchPoints > 0 ? String(navigator.maxTouchPoints) : 'None reported',
    },
  ]

  if (navigator.hardwareConcurrency) {
    facts.push({ label: 'CPU cores', value: String(navigator.hardwareConcurrency) })
  }

  // Chrome rounds this to a power of two and caps it at 8, so it is a floor.
  if (navigator.deviceMemory) {
    facts.push({ label: 'Memory', value: `${navigator.deviceMemory} GB or more` })
  }

  facts.push({ label: 'Network', value: navigator.onLine ? 'Online' : 'Offline' })

  return facts
}

/** The plain-text report a visitor can copy or share. */
export function buildReportText(results, facts, finishedAt = new Date()) {
  const lines = [
    'ReFon phone health check',
    finishedAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
    '',
  ]

  for (const check of HEALTH_CHECKS) {
    const result = results[check.id] ?? { status: 'idle' }
    const status = CHECK_STATUS[result.status]?.label ?? result.status
    lines.push(`${check.label}: ${status}${result.note ? ` (${result.note})` : ''}`)
  }

  if (facts.length > 0) {
    lines.push('')

    for (const fact of facts) {
      lines.push(`${fact.label}: ${fact.value}`)
    }
  }

  lines.push(
    '',
    'A browser self-test, not a substitute for ReFon’s 11-point inspection. Battery health, biometrics, buttons and IMEI are not reachable from a web page.',
  )

  return lines.join('\n')
}
