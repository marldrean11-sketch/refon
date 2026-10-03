import { useContext } from 'react'
import { SavedListingsContext } from './saved-listings-context.js'

const EMPTY_SAVED_IDS = new Set()

const noop = async () => {}

// Visitors who are not buyers (anonymous, seller, admin) get an inert value
// rather than a thrown error, because the heart renders on public listing cards.
export const anonymousSavedListings = {
  savedIds: EMPTY_SAVED_IDS,
  isSaved: () => false,
  toggle: noop,
  isLoading: false,
}

export function useSavedListings() {
  const context = useContext(SavedListingsContext)
  return context ?? anonymousSavedListings
}
