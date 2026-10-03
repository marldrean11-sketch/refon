import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function RouteEffects() {
  const location = useLocation()
  const previousPath = useRef(null)

  useEffect(() => {
    const hasNavigated = previousPath.current !== null
    previousPath.current = `${location.pathname}${location.search}${location.hash}`

    const pageTitle = location.pathname === '/'
      ? 'ReFon · Confident second-hand phones'
      : location.pathname === '/browse'
        ? 'Browse verified phones · ReFon'
        : location.pathname.startsWith('/listings/')
          ? 'Listing details · ReFon'
          : location.pathname === '/login'
            ? 'Sign in · ReFon'
            : location.pathname === '/register'
              ? 'Create an account · ReFon'
              : location.pathname === '/seller'
                ? 'Seller dashboard · ReFon'
                : location.pathname === '/seller/inquiries'
                  ? 'Inquiry inbox · ReFon'
                  : location.pathname.startsWith('/seller/')
                    ? 'Seller listing workspace · ReFon'
                    : location.pathname === '/admin'
                      ? 'Admin dashboard · ReFon'
                      : location.pathname === '/forbidden'
                        ? 'Access restricted · ReFon'
                        : 'Page not found · ReFon'
    document.title = pageTitle

    const timer = window.setTimeout(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) {
          target.scrollIntoView({ block: 'start' })
        }
      } else {
        window.scrollTo(0, 0)
      }

      if (hasNavigated && !location.hash) {
        document.getElementById('main-content')?.focus({ preventScroll: true })
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.hash, location.pathname, location.search])

  return null
}
