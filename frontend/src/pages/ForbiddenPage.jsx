import { ArrowLeft, ShieldX } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { getRoleHome } from '../features/auth/auth.routes.js'
import { useAuth } from '../features/auth/useAuth.js'

export function ForbiddenPage() {
  const { user } = useAuth()
  const location = useLocation()
  const roleHome = location.state?.roleHome ?? getRoleHome(user.role)
  const reduceMotion = useReducedMotion()

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-3xl place-items-center px-4 py-12 sm:px-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-card-xl border border-line bg-white p-8 text-center shadow-card sm:p-12"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-danger">
          <ShieldX className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-danger">
          Role-protected route
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          This area belongs to another role.
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-body text-muted">
          ReFon blocked this page because your {user.role.toLowerCase()} account does
          not have the required permission.
        </p>
        <Link
          to={roleHome}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Go to my workspace
        </Link>
      </motion.div>
    </section>
  )
}
