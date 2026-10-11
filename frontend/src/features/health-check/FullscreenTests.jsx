import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button.jsx'

/**
 * The two tests that need the whole screen.
 *
 * Both render into a portal above every other layer (`z-modal`), including the
 * mobile tab bar, and ask the browser for real fullscreen where it allows it. A
 * phone that refuses fullscreen (iOS Safari on iPhone) still gets the overlay,
 * which covers everything but the browser's own chrome.
 */

function enterFullscreen() {
  const root = document.documentElement

  if (!document.fullscreenElement && root.requestFullscreen) {
    root.requestFullscreen().catch(() => {})
  }
}

function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {})
  }
}

function Overlay({ children, className = '', ...rest }) {
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
      exitFullscreen()
    }
  }, [])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-modal select-none ${className}`}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  )
}

/** The closing question both tests end on, set on a card in the middle of the screen. */
function Verdict({ question, yes, no, onAnswer }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/75 p-6">
      <div className="w-full max-w-sm rounded-card-lg bg-card p-6 text-center shadow-pop">
        <p className="text-lg font-bold leading-snug text-ink">{question}</p>
        <div className="mt-6 grid gap-2.5">
          <Button variant="brand" onClick={() => onAnswer('passed')}>
            {yes}
          </Button>
          <Button variant="secondary" onClick={() => onAnswer('failed')}>
            {no}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAnswer('skipped')}>
            Cancel this test
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Flat full-screen colours. Black finds stuck-lit pixels, white and the primaries
 * find dead sub-pixels, and mid-grey is where OLED burn-in shows.
 */
const DISPLAY_COLOURS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Grey', value: '#808080' },
]

export function DisplayTest({ onResult }) {
  const [index, setIndex] = useState(0)
  const [showHint, setShowHint] = useState(true)
  const isDone = index >= DISPLAY_COLOURS.length

  useEffect(() => {
    enterFullscreen()
    const timer = window.setTimeout(() => setShowHint(false), 2200)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        onResult('skipped')
      } else if (!isDone && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight')) {
        event.preventDefault()
        setIndex((value) => value + 1)
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [isDone, onResult])

  const colour = DISPLAY_COLOURS[Math.min(index, DISPLAY_COLOURS.length - 1)]

  return (
    <Overlay
      aria-label={`Display test, ${colour.name} screen`}
      style={{ backgroundColor: colour.value }}
      onClick={() => !isDone && setIndex((value) => value + 1)}
    >
      {showHint && !isDone && (
        <p className="pointer-events-none absolute inset-x-0 bottom-10 mx-auto w-fit rounded-control bg-black/80 px-4 py-2 text-sm font-semibold text-chalk">
          Look closely, then tap to see the next colour
        </p>
      )}

      {isDone && (
        <Verdict
          question="Did the screen look even on every colour?"
          yes="Yes, no dots or shadows"
          no="No, I saw dots or marks"
          onAnswer={(status) =>
            onResult(
              status,
              status === 'failed' ? 'Dots, lines or burn-in seen on a flat colour' : undefined,
            )
          }
        />
      )}
    </Overlay>
  )
}

/** Columns in the touch grid. Rows follow the screen's shape so tiles stay square. */
const TOUCH_COLUMNS = 6

export function TouchTest({ onResult }) {
  const gridRef = useRef(null)
  const [rows, setRows] = useState(10)
  const [touched, setTouched] = useState(() => new Set())
  const [asking, setAsking] = useState(false)
  const total = rows * TOUCH_COLUMNS

  useEffect(() => {
    enterFullscreen()

    function measure() {
      const grid = gridRef.current

      if (grid) {
        const { width, height } = grid.getBoundingClientRect()
        setRows(Math.max(6, Math.round((height / width) * TOUCH_COLUMNS)))
      }
    }

    measure()
    window.addEventListener('resize', measure)

    return () => window.removeEventListener('resize', measure)
  }, [])

  // Every pointer that crosses a tile marks it, so one finger dragged across the
  // screen covers a whole row. The index comes from the position, not from the
  // element under the finger, because a captured pointer keeps reporting the
  // element it started on.
  const mark = useCallback(
    (event) => {
      const grid = gridRef.current

      if (!grid || (event.pointerType === 'mouse' && event.buttons === 0)) {
        return
      }

      const box = grid.getBoundingClientRect()
      const column = Math.floor(((event.clientX - box.left) / box.width) * TOUCH_COLUMNS)
      const row = Math.floor(((event.clientY - box.top) / box.height) * rows)

      if (column < 0 || column >= TOUCH_COLUMNS || row < 0 || row >= rows) {
        return
      }

      const key = row * TOUCH_COLUMNS + column

      setTouched((current) => {
        if (current.has(key)) {
          return current
        }

        const next = new Set(current)
        next.add(key)
        return next
      })
    },
    [rows],
  )

  useEffect(() => {
    if (touched.size >= total) {
      onResult('passed', `All ${total} areas responded`)
    }
  }, [touched, total, onResult])

  const missed = total - touched.size

  return (
    <Overlay aria-label="Touchscreen test" className="flex flex-col bg-page">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          <span className="tabular-nums">{touched.size}</span> of{' '}
          <span className="tabular-nums">{total}</span> areas
        </p>
        <Button size="sm" variant="secondary" onClick={() => setAsking(true)}>
          Finish early
        </Button>
      </div>

      <div
        ref={gridRef}
        className="grid flex-1 touch-none"
        style={{
          gridTemplateColumns: `repeat(${TOUCH_COLUMNS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
        onPointerDown={mark}
        onPointerMove={mark}
      >
        {Array.from({ length: total }, (_, key) => (
          <span
            key={key}
            className={`border border-line/70 transition-colors duration-150 ${
              touched.has(key) ? 'bg-accent' : 'bg-page'
            }`}
          />
        ))}
      </div>

      {asking && (
        <Verdict
          question={`${missed} ${missed === 1 ? 'area is' : 'areas are'} still white. Did ${missed === 1 ? 'it' : 'they'} refuse to respond?`}
          yes="No, I just stopped early"
          no="Yes, some areas don't respond"
          onAnswer={(status) => {
            if (status === 'passed') {
              onResult('skipped', `Stopped with ${missed} of ${total} areas untested`)
            } else if (status === 'failed') {
              onResult('failed', `${missed} of ${total} areas did not respond`)
            } else {
              onResult('skipped')
            }
          }}
        />
      )}
    </Overlay>
  )
}
