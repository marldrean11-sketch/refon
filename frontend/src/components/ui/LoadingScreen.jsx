import { LoaderCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { BrandMark } from './BrandMark.jsx'

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
        <BrandMark />
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <LoaderCircle className="size-4 animate-spin text-primary-500 motion-reduce:animate-none" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </motion.div>
    </div>
  )
}
