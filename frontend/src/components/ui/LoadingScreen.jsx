import { motion } from 'framer-motion'
import { LogoGlyph } from './BrandMark.jsx'

export function LoadingScreen({ label = 'Preparing your ReFon experience…' }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 text-center"
        role="status"
        aria-live="polite"
      >
        <LogoGlyph className="size-16" draw={false} loading />
        <span className="text-sm font-medium text-muted">{label}</span>
      </motion.div>
    </div>
  )
}
