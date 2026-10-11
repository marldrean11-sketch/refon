import { useEffect, useState } from 'react'
import { LogoGlyph } from '../ui/BrandMark.jsx'
import { Confetti } from '../ui/Confetti.jsx'
import { Modal } from '../ui/Modal.jsx'
import { POP_GOAL, getPopState, onPopChange } from '../../lib/pop-challenge.js'
import { boothLabel } from '../../content/site-info.js'
import { play } from '../../lib/sound.js'

/**
 * The pop challenge tracker and its reward.
 *
 * A small pill appears bottom-left after the first loop is popped and fills
 * toward ten. At ten, a "Loop Master" badge opens: the visitor shows it at the
 * booth for a free sticker or candy. The pill stays afterwards so the badge can
 * be opened again at the table.
 */
export function PopChallenge() {
  const [state, setState] = useState({ count: 0, unlockedAt: null, code: null })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setState(getPopState()))
    const off = onPopChange((next) => {
      setState(next)
      if (next.justUnlocked) {
        setOpen(true)
        play('chime')
      }
    })
    return () => {
      cancelAnimationFrame(id)
      off()
    }
  }, [])

  if (state.count === 0) return null

  const unlocked = Boolean(state.unlockedAt)
  const progress = Math.min(1, state.count / POP_GOAL)

  return (
    <>
      <button
        type="button"
        data-testid="pop-challenge"
        onClick={() => unlocked && setOpen(true)}
        aria-label={
          unlocked
            ? 'Open your Loop Master booth badge'
            : `Pop challenge: ${Math.min(state.count, POP_GOAL)} of ${POP_GOAL} loops popped`
        }
        className={`rf-bounce fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-4 z-header flex items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-[13px] font-semibold shadow-pop backdrop-blur lg:bottom-6 lg:left-6 ${
          unlocked ? 'border-accent bg-accent text-page' : 'border-line-2 bg-card/90 text-ink'
        }`}
      >
        <LogoGlyph className="size-8" draw={false} inverse={unlocked} />
        {unlocked ? (
          <span>Loop Master · show badge</span>
        ) : (
          <span className="flex flex-col items-start gap-1">
            <span>
              Pop challenge {Math.min(state.count, POP_GOAL)}/{POP_GOAL}
            </span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full w-full origin-left rounded-full bg-accent transition-transform duration-300"
                style={{ transform: `scaleX(${progress})` }}
              />
            </span>
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Loop Master!" size="sm">
        <div data-testid="loop-master-badge" className="relative flex flex-col items-center gap-4 text-center">
          <Confetti active={open} burstKey={state.code ?? 'badge'} sound={null} />
          <span className="rf-logo-click grid size-24 place-items-center rounded-[28px] bg-accent">
            <LogoGlyph className="size-20" draw={false} />
          </span>
          <p className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">
            Panalo! You popped {state.count} loops.
          </p>
          <p className="text-muted">
            Show this screen at the ReFon booth for a <strong className="text-ink">free sticker or candy</strong>.
          </p>
          <div className="w-full rounded-2xl border border-dashed border-accent/60 bg-accent-100 px-4 py-3 font-mono text-sm text-accent">
            <div>BADGE {state.code}</div>
            <div className="text-[12px] text-muted">
              {boothLabel()} ·{' '}
              {state.unlockedAt ? new Date(state.unlockedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </div>
          </div>
          <p className="text-[12px] text-subtle">One treat per visitor, while booth supplies last.</p>
        </div>
      </Modal>
    </>
  )
}
