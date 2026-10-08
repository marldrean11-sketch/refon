import { useEffect, useRef } from 'react'
import { useToast } from '../../components/ui/Toast.jsx'
import { useCart } from './useCart.js'

/**
 * Replays a deferred add-to-cart once the buyer is signed in, and says what happened.
 *
 * This lives inside `ToastProvider` rather than in `CartProvider` because the toast
 * provider is nested below the cart provider: it is the one place in the tree that
 * can both read the cart and raise a toast.
 *
 * The effect keys on `isReady` rather than on "a user exists", because a buyer whose
 * session has resolved but whose cart has not been read yet would otherwise replay
 * against a cart it has not seen. `replayPendingIntent` is idempotent — the stored
 * intent is cleared before it is read — so React StrictMode invoking this twice in
 * development still adds the phone exactly once.
 *
 * Renders nothing. All of its output is a toast.
 */
export function PendingIntentReplay() {
  const { isReady, isBuyer, replayPendingIntent } = useCart()
  const toast = useToast()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!isBuyer || !isReady || hasRun.current) {
      return
    }

    hasRun.current = true

    replayPendingIntent()
      .then((result) => {
        if (!result) {
          return
        }

        if (result.status === 'added') {
          toast.success(`${result.device} added to your cart.`, {
            description: 'We held it for you while you signed in.',
          })
          return
        }

        if (result.status === 'taken') {
          toast.error('That phone was taken while you were signing in.', {
            description: 'Someone else got there first. Browse for another one.',
          })
          return
        }

        toast.error('We could not add that phone to your cart.', {
          description: result.message,
        })
      })
      .catch(() => {
        // `replayPendingIntent` reports its own failures; this guard only exists so a
        // rejected promise here cannot surface as an unhandled rejection.
      })
  }, [isBuyer, isReady, replayPendingIntent, toast])

  return null
}