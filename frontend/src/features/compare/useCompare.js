import { useContext } from 'react'
import { CompareContext } from './compare-context.js'

export function useCompare() {
  const context = useContext(CompareContext)

  if (!context) {
    throw new Error('useCompare must be used inside a CompareProvider')
  }

  return context
}
