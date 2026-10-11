import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getInstallState, onInstallChange, promptInstall } from '../../lib/pwa.js'
import { Modal } from './Modal.jsx'

/**
 * Footer "Install app" button. Shows the browser's install dialog where there is
 * one, explains Add to Home Screen on iPhone, and hides itself once ReFon runs
 * as an installed app or the browser cannot install it.
 */
export function InstallAppButton({ className = '' }) {
  const [state, setState] = useState('unavailable')
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setState(getInstallState()))
    const off = onInstallChange(setState)
    return () => {
      cancelAnimationFrame(id)
      off()
    }
  }, [])

  if (state === 'installed' || state === 'unavailable') return null

  return (
    <>
      <button
        type="button"
        data-testid="install-app"
        onClick={() => (state === 'ios' ? setShowIosHelp(true) : promptInstall())}
        className={`rf-bounce inline-flex min-h-11 items-center gap-2 rounded-full border border-accent px-4 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent hover:text-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      >
        <Download className="size-4" aria-hidden="true" />
        Install app
      </button>
      <Modal open={showIosHelp} onClose={() => setShowIosHelp(false)} title="Add ReFon to your Home Screen">
        <ol className="list-inside list-decimal space-y-2 text-sm leading-body text-muted">
          <li>
            Tap the <span className="font-semibold text-ink">Share</span> button in Safari.
          </li>
          <li>
            Choose <span className="font-semibold text-ink">Add to Home Screen</span>.
          </li>
          <li>
            Tap <span className="font-semibold text-ink">Add</span>. ReFon opens full screen, like an app.
          </li>
        </ol>
      </Modal>
    </>
  )
}
