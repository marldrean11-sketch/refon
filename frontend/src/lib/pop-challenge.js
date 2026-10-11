/**
 * The pop challenge: pop ten floating loops to unlock the booth badge.
 *
 * Progress lives in this browser only (localStorage), so it survives moving
 * between pages and reloading, and it never leaves the device. The badge code
 * is a short random tag that makes each badge look unique on screen; it is not
 * a voucher and nothing checks it.
 */
export const POP_GOAL = 10

const KEY = 'refon:pops'
const EVENT = 'refon:pops'

function read() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw.count === 'number') return raw
  } catch {
    // Unreadable storage: start fresh.
  }
  return { count: 0, unlockedAt: null, code: null }
}

function write(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: progress lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }))
}

export function getPopState() {
  return typeof window === 'undefined' ? { count: 0, unlockedAt: null, code: null } : read()
}

/** Counts one pop; unlocks the badge on reaching the goal. */
export function recordPop() {
  const state = read()
  const count = state.count + 1
  const unlocking = !state.unlockedAt && count >= POP_GOAL
  write({
    count,
    unlockedAt: unlocking ? new Date().toISOString() : state.unlockedAt,
    code: unlocking ? Math.random().toString(36).slice(2, 6).toUpperCase() : state.code,
    justUnlocked: unlocking,
  })
}

export function onPopChange(listener) {
  const handler = (event) => listener(event.detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
