import { ArrowLeft, SearchX } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { standardTransition, usePrefersReducedMotion } from '../lib/motion.ts'

export function NotFoundPage() {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-canvas px-5 py-12 focus:outline-none"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-100/70 blur-3xl"
        aria-hidden="true"
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={standardTransition}
        className="relative w-full max-w-lg rounded-card-xl border border-line bg-white p-8 text-center shadow-card sm:p-12"
        aria-labelledby="not-found-title"
      >
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <span className="mx-auto mt-10 grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <SearchX className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
          404 · Page not found
        </p>
        <h1 id="not-found-title" className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          This ReFon page has moved on.
        </h1>
        <p className="mt-4 leading-body text-muted">
          The address may be outdated, or the page has not been built yet.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={AUTH_ROUTES.home}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return home
          </Link>
          <Link
            to={AUTH_ROUTES.buyer}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary-700 shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50"
          >
            Browse phones
          </Link>
        </div>
      </motion.div>
    </main>
  )
}
