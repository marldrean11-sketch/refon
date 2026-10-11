/**
 * Tiny interface sounds, synthesised with Web Audio so there are no audio files
 * to download. Off by default: a page that makes noise without being asked is a
 * page people close. The visitor turns them on with the speaker toggle in the
 * footer, and the choice is remembered on this device.
 */

const KEY = 'refon:sound'
const listeners = new Set()

let context = null
let enabled = readStored()

function readStored() {
  try {
    return window.localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

export function isSoundOn() {
  return enabled
}

export function setSoundOn(next) {
  enabled = Boolean(next)
  try {
    window.localStorage.setItem(KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage blocked: the setting lasts for this page only.
  }
  listeners.forEach((listener) => listener(enabled))
  if (enabled) play('click')
}

/** Subscribe to changes; returns the unsubscribe function. */
export function onSoundChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function audio() {
  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  if (context.state === 'suspended') context.resume().catch(() => {})
  return context
}

/** One short tone with a quick attack and an exponential fade. */
function tone(ctx, { from, to = from, duration, type = 'sine', gain = 0.12, delay = 0 }) {
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

const SOUNDS = {
  click: (ctx) => tone(ctx, { from: 900, to: 600, duration: 0.05, type: 'triangle', gain: 0.06 }),
  pop: (ctx) => tone(ctx, { from: 420, to: 1300, duration: 0.12, type: 'sine', gain: 0.14 }),
  confetti: (ctx) => {
    tone(ctx, { from: 660, duration: 0.09, type: 'triangle', gain: 0.08 })
    tone(ctx, { from: 990, duration: 0.12, type: 'triangle', gain: 0.07, delay: 0.07 })
  },
  chime: (ctx) => {
    tone(ctx, { from: 784, duration: 0.18, gain: 0.08 })
    tone(ctx, { from: 1047, duration: 0.25, gain: 0.07, delay: 0.1 })
  },
}

/** Plays a named sound if sounds are on. Safe to call anywhere, any time. */
export function play(name) {
  if (!enabled || typeof window === 'undefined') return
  const ctx = audio()
  if (ctx) SOUNDS[name]?.(ctx)
}

/**
 * One document-level listener that clicks for buttons and button-styled links,
 * so no component has to opt in. Installed once from `main.jsx`.
 */
export function installClickSounds() {
  if (typeof document === 'undefined') return
  document.addEventListener(
    'click',
    (event) => {
      if (event.target.closest?.('button, [role="button"], .rf-bounce')) play('click')
    },
    { capture: true },
  )
}
