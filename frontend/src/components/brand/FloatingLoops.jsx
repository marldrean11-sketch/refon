import { useEffect, useRef, useState } from 'react'
import { LogoGlyph } from '../ui/BrandMark.jsx'
import { Confetti } from '../ui/Confetti.jsx'
import { play } from '../../lib/sound.js'
import { recordPop } from '../../lib/pop-challenge.js'

/**
 * Where each rising Loop starts and how it moves. Fixed rather than random so
 * the first paint and every later render agree, and so the background looks
 * the same in a screenshot as it did at the booth.
 */
const LOOPS = Object.freeze([
  { left: '6%', size: 46, duration: 10, delay: 0, rotate: -10, opacity: 0.6 },
  { left: '19%', size: 32, duration: 13, delay: 3, rotate: 12, opacity: 0.45 },
  { left: '33%', size: 56, duration: 11, delay: 6, rotate: -4, opacity: 0.5 },
  { left: '51%', size: 38, duration: 14, delay: 1, rotate: 20, opacity: 0.4 },
  { left: '67%', size: 50, duration: 9, delay: 4, rotate: -18, opacity: 0.55 },
  { left: '81%', size: 34, duration: 12, delay: 8, rotate: 6, opacity: 0.45 },
  { left: '92%', size: 42, duration: 10, delay: 2, rotate: -8, opacity: 0.5 },
])

/**
 * Loop colours follow the condition grades: lime A, amber B, coral C. A section
 * on a coloured panel (the auth screens) passes one `loopClassName` instead.
 */
const GRADE_COLORS = ['text-grade-a', 'text-grade-b', 'text-grade-c']
const GRADE_RINGS = ['border-grade-a', 'border-grade-b', 'border-grade-c']
const GRADE_FILLS = ['bg-grade-a', 'bg-grade-b', 'bg-grade-c']

/** Clicks on these go to the control, never to a loop drifting behind it. */
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="switch"]'

/** A little slack around each loop so a moving target is easy to hit. */
const HIT_SLOP = 12

/** The surprise a popped loop can turn into. One is picked per pop. */
const REACTIONS = ['confetti', 'split', 'word', 'spin']

/** How often a pop turns into a word rather than another surprise. */
const WORD_CHANCE = 0.9

/**
 * Taglish shop-talk for the word pops, in four groups: value, trust, hype and
 * hustle. Nothing here promises a discount, a deadline or limited stock: ReFon
 * does not use fake urgency, even in a joke.
 */
const WORDS = [
  // Value and price
  'Sulit deal!',
  'Swak sa budget!',
  'Presyong kaibigan!',
  'Tipid tech!',
  'Abot-kaya!',
  'Bawat piso, sulit!',
  // Trust and quality
  'Legit seller!',
  'Walang daya!',
  'Tested, hindi hula!',
  'Grade A vibes!',
  'May warranty!',
  'Battery check: pasado!',
  // Hype and fun
  'Panalo!',
  'Pak na pak!',
  'Lodi deal!',
  'Solid!',
  'G na G!',
  'Petmalu!',
  "Ayos 'yan!",
  // Business and hustle
  'Benta!',
  'Kita-kits sa booth!',
  'Upgrade na!',
  'Trade-in mo na!',
  'Second life, first class!',
  'Pre-loved, pro-level!',
]

/** Mini loops flung out by a split, as fixed directions. */
const SPLIT = [
  { dx: '-46px', dy: '-38px', r: '-140deg' },
  { dx: '48px', dy: '-30px', r: '160deg' },
  { dx: '4px', dy: '-62px', r: '220deg' },
]

/** Pops closer together than this keep a combo going. */
const COMBO_WINDOW_MS = 1600

/**
 * About one loop in eleven comes back golden after a pop. Derived from the loop
 * and how often it has been popped, so it is the same on every render and
 * rewards a visitor who keeps popping.
 */
function isGolden(index, generation) {
  return ((index + 1) * 31 + generation * 17) % 11 === 0
}

/**
 * The floating-loops background: outlines of the Loop logo drifting up over a
 * neon grid floor that scrolls toward the viewer, and a small toy on top.
 *
 * - Pointing at a loop makes it glow and wiggle.
 * - Clicking or tapping one pops it into a random surprise: confetti, a split
 *   into three mini loops, a spin-off, or a Taglish word. A new loop floats up
 *   from the bottom a moment later.
 * - Popping several in quick succession builds a combo ("x3 combo!").
 * - Now and then a loop comes back golden; popping it is a jackpot.
 *
 * The layer sits *behind* the section's content, so instead of taking pointer
 * events itself it hit-tests pointer positions from its parent section: a press
 * on empty space or plain text over a loop pops it, while a press on a link or
 * button always reaches that control. It stays `aria-hidden`: decoration with a
 * bonus, and nothing on the page depends on it.
 */
export function FloatingLoops({
  className = '',
  floor = true,
  density = 'full',
  loopClassName = null,
  legend = false,
}) {
  const loops = density === 'light' ? LOOPS.filter((_, i) => i % 2 === 0) : LOOPS
  const layerRef = useRef(null)
  const loopRefs = useRef([])
  const comboRef = useRef({ count: 0, at: 0 })
  const lastKindRef = useRef(null)
  const lastWordRef = useRef(null)
  const [generation, setGeneration] = useState(() => loops.map(() => 0))
  const generationRef = useRef(generation)
  const [hovered, setHovered] = useState(-1)
  const [bursts, setBursts] = useState([])

  useEffect(() => {
    generationRef.current = generation
  }, [generation])

  useEffect(() => {
    const layer = layerRef.current
    const host = layer?.parentElement
    if (!layer || !host) return undefined

    /** Index of the loop under a viewport point, or -1. */
    function loopAt(x, y) {
      for (let i = loopRefs.current.length - 1; i >= 0; i -= 1) {
        const node = loopRefs.current[i]
        if (!node || node.dataset.popped === 'true') continue
        const r = node.getBoundingClientRect()
        if (
          x >= r.left - HIT_SLOP &&
          x <= r.right + HIT_SLOP &&
          y >= r.top - HIT_SLOP &&
          y <= r.bottom + HIT_SLOP
        ) {
          return i
        }
      }
      return -1
    }

    function onMove(event) {
      if (event.pointerType !== 'mouse') return
      const i = event.target.closest?.(INTERACTIVE) ? -1 : loopAt(event.clientX, event.clientY)
      setHovered((current) => (current === i ? current : i))
      host.style.cursor = i >= 0 ? 'pointer' : ''
    }

    function onDown(event) {
      if (event.target.closest?.(INTERACTIVE)) return
      const i = loopAt(event.clientX, event.clientY)
      if (i < 0) return

      const node = loopRefs.current[i]
      const box = node.getBoundingClientRect()
      const base = layer.getBoundingClientRect()
      node.dataset.popped = 'true'

      const now = Date.now()
      const combo = now - comboRef.current.at < COMBO_WINDOW_MS ? comboRef.current.count + 1 : 1
      comboRef.current = { count: combo, at: now }

      const golden = isGolden(i, generationRef.current[i] ?? 0)
      // Most pops (WORD_CHANCE) turn into a word; the rest pick another surprise,
      // different from the last one so two of those never look alike.
      const others = REACTIONS.filter((reaction) => reaction !== 'word' && reaction !== lastKindRef.current)
      const kind = golden
        ? 'jackpot'
        : Math.random() < WORD_CHANCE
          ? 'word'
          : others[Math.floor(Math.random() * others.length)]
      lastKindRef.current = kind
      // Never the same word twice in a row.
      const words = WORDS.filter((candidate) => candidate !== lastWordRef.current)
      const word = golden ? 'Jackpot! Sulit na sulit!' : words[Math.floor(Math.random() * words.length)]
      if (kind === 'word') lastWordRef.current = word

      const id = `${i}-${now}`
      setBursts((list) => [
        ...list,
        {
          id,
          tone: i % GRADE_COLORS.length,
          kind,
          word,
          combo,
          size: box.width,
          x: box.left - base.left + box.width / 2,
          y: box.top - base.top + box.height / 2,
        },
      ])
      setHovered(-1)
      host.style.cursor = ''
      play(kind === 'spin' ? 'click' : kind === 'jackpot' ? 'chime' : 'pop')
      recordPop()

      // Clear the effect, then send a fresh loop up from the bottom.
      window.setTimeout(() => setBursts((list) => list.filter((burst) => burst.id !== id)), 1300)
      window.setTimeout(() => {
        node.dataset.popped = 'false'
        setGeneration((list) => list.map((value, index) => (index === i ? value + 1 : value)))
      }, 1200)
    }

    function onLeave() {
      setHovered(-1)
      host.style.cursor = ''
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointerleave', onLeave)
      host.style.cursor = ''
    }
  }, [])

  return (
    <>
      <div
        ref={layerRef}
        aria-hidden="true"
        data-testid="floating-loops"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        {floor && <div className="rf-floor" />}
        {loops.map((loop, i) => {
          const golden = isGolden(i, generation[i])
          const color = loopClassName ?? GRADE_COLORS[i % GRADE_COLORS.length]
          return (
            <span
              // A new key restarts the rise from the bottom after a pop.
              key={`${loop.left}-${generation[i]}`}
              ref={(node) => {
                loopRefs.current[i] = node
              }}
              data-loop-index={i}
              data-golden={golden ? 'true' : undefined}
              className={`rf-rising-loop ${golden ? 'text-[#ffd23f]' : color}`}
              style={{
                left: loop.left,
                width: loop.size,
                height: loop.size,
                opacity: golden ? 0.95 : loop.opacity,
                animationDuration: `${loop.duration}s`,
                animationDelay: generation[i] ? '0s' : `${loop.delay}s`,
                '--r': `${loop.rotate}deg`,
              }}
            >
              <span
                className={`rf-loop-toy block size-full ${hovered === i ? 'is-hovered' : ''} ${golden ? 'is-golden' : ''}`}
              >
                <LogoGlyph tile={false} draw={false} className="block size-full" />
              </span>
            </span>
          )
        })}
        {bursts.map((burst) => (
          <LoopBurst key={burst.id} burst={burst} loopClassName={loopClassName} />
        ))}
      </div>
      {legend && !loopClassName && <LoopLegend />}
    </>
  )
}

const LEGEND = [
  { grade: 'A', fill: 'bg-grade-a', text: 'text-grade-a' },
  { grade: 'B', fill: 'bg-grade-b', text: 'text-grade-b' },
  { grade: 'C', fill: 'bg-grade-c', text: 'text-grade-c' },
]

/**
 * A small key under the loops: the colours are the condition grades, so a
 * visitor playing with them also learns how ReFon grades a phone.
 */
function LoopLegend() {
  return (
    <p
      data-testid="loop-legend"
      className="pointer-events-none absolute bottom-3 right-4 z-10 hidden items-center gap-3 rounded-full border border-line bg-page/80 px-3 py-1.5 font-mono text-[11px] text-muted backdrop-blur sm:flex"
    >
      <span>Loop colours:</span>
      {LEGEND.map((item) => (
        <span key={item.grade} className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${item.fill}`} aria-hidden="true" />
          <span className={item.text}>Grade {item.grade}</span>
        </span>
      ))}
    </p>
  )
}

/** What a popped loop turns into, drawn where it was. */
function LoopBurst({ burst, loopClassName: single }) {
  const { kind, word, combo, size, x, y, id, tone } = burst
  const loopClassName = single ?? GRADE_COLORS[tone]
  const ring = single ? 'border-accent' : GRADE_RINGS[tone]
  const fill = single ? 'bg-accent' : GRADE_FILLS[tone]
  const showWord = kind === 'word' || kind === 'jackpot'

  return (
    <span className="absolute size-0" style={{ left: x, top: y }}>
      {(kind === 'confetti' || kind === 'jackpot') && (
        <>
          <span
            className={`rf-loop-popped absolute -left-6 -top-6 size-12 rounded-full border-2 ${
              kind === 'jackpot' ? 'border-[#ffd23f]' : ring
            }`}
          />
          <Confetti active burstKey={id} sound={null} />
          {kind === 'jackpot' && <Confetti active burstKey={`${id}-2`} sound={null} />}
        </>
      )}

      {kind === 'split' &&
        SPLIT.map((piece) => (
          <span
            key={piece.dx}
            className={`rf-loop-split absolute ${loopClassName}`}
            style={{
              width: size * 0.45,
              height: size * 0.45,
              left: -(size * 0.45) / 2,
              top: -(size * 0.45) / 2,
              '--dx': piece.dx,
              '--dy': piece.dy,
              '--r': piece.r,
            }}
          >
            <LogoGlyph tile={false} draw={false} className="block size-full" />
          </span>
        ))}

      {kind === 'spin' && (
        <span
          className={`rf-loop-spinoff absolute ${loopClassName}`}
          style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
        >
          <LogoGlyph tile={false} draw={false} className="block size-full" />
        </span>
      )}

      {showWord && (
        <span
          className={`rf-loop-word absolute left-0 top-0 whitespace-nowrap rounded-full px-3 py-1 font-display text-sm font-bold ${
            kind === 'jackpot' ? 'bg-[#ffd23f] text-page' : `${fill} text-page`
          }`}
        >
          {word}
        </span>
      )}

      {combo > 1 && (
        <span className="rf-loop-combo absolute left-0 top-0 whitespace-nowrap font-mono text-base font-bold text-accent">
          x{combo} combo!
        </span>
      )}
    </span>
  )
}
