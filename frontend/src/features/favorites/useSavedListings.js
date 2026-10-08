import { useContext } from 'react'
import { SavedListingsContext } from './saved-listings-context.js'

const EMPTY_SAVED_IDS = new Set()

const noop = async () => {}

// Visitors and signed-in non-buyers (seller, admin) get an inert value rather than a
// thrown error, because the heart renders on public listing cards. `toggle` is a
// no-op so a click on it never produces a refused request; the heart itself decides
// what to do for someone who cannot own a wishlist.
export const anonymousSavedListings = {
  savedIds: EMPTY_SAVED_IDS,
  isSaved: () => false,
  toggle: noop,
  isLoading: false,
  isBuyer: false,
}

export function useSavedListings() {
  const context = useContext(SavedListingsContext)
  return context ?? anonymousSavedListings
}
