import { useEffect, useRef, useState } from 'react'
import { Mail, MessageCircle, Phone, X } from 'lucide-react'
import { SITE_INFO } from '../../content/site-info.js'
import { useSiteSettings } from '../../lib/site-settings.js'

/**
 * The floating "Chat with us" button, bottom-right.
 *
 * It opens a small menu of ways to reach the team: Viber when an admin has set
 * its link (shown as "coming soon" until then),
 * plus email and phone, which always work. Escape or a click outside closes it.
 */
export function ChatButton() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const { contact } = SITE_INFO
  const { viber } = useSiteSettings()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const options = [
    { key: 'viber', label: 'Viber', href: viber, icon: Phone },
    { key: 'email', label: contact.email, href: `mailto:${contact.email}`, icon: Mail },
    { key: 'phone', label: contact.phone, href: contact.phoneHref, icon: Phone },
  ]

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-header flex flex-col items-end gap-3 lg:bottom-6 lg:right-6"
    >
      {open && (
        <div
          id="chat-menu"
          data-testid="chat-menu"
          className="rf-rise w-72 rounded-[24px] border border-line-2 bg-card p-3 shadow-pop"
        >
          <p className="px-2 pb-2 pt-1 font-display text-base font-bold text-ink">Chat with ReFon</p>
          <p className="px-2 pb-3 text-[13px] text-muted">{contact.hours}</p>
          <ul className="flex flex-col gap-1.5">
            {options.map(({ key, label, href, icon: Icon }) => (
              <li key={key}>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer' : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-ink transition-colors hover:bg-well hover:text-accent"
                  >
                    <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </a>
                ) : (
                  <span className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm text-subtle">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                    <span className="ml-auto rounded-full border border-dashed border-line-2 px-2 py-0.5 text-[11px]">soon</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        data-testid="chat-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="chat-menu"
        aria-label={open ? 'Close chat options' : 'Chat with us'}
        className="rf-bounce grid size-14 place-items-center rounded-full bg-accent text-page shadow-pop hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <MessageCircle className="size-6" aria-hidden="true" />}
      </button>
    </div>
  )
}
