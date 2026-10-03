import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { pageTransition } from '../../lib/motion.js'

export function PageTransition({ children }) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={pageTransition}
        className="min-h-[inherit]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
