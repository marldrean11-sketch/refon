/**
 * Navbar, search overlay, and cart drawer state.
 *
 * Three open surfaces that must not be open at once, and each one has to give
 * focus back when it closes. That coordination is the whole reason this is one
 * module rather than three independent `useState`s inside the header.
 *
 * Kept outside the component tree deliberately: the drawer and the overlay each
 * render through `createPortal` at the document root, so they cannot read
 * context from the header that opened them.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NavbarUiContext = createContext(null)

/** Which surface, if any, currently owns the screen. */
export const SURFACE = Object.freeze({
  none: null,
  search: 'search',
  cart: 'cart',
  mobileMenu: 'mobile',
})

export function NavbarUiProvider({ children }) {
  const [surface, setSurface] = useState(SURFACE.none)

  // Only one at a time. Opening one closes the others, because two overlays and
  // a dimmed backdrop stacked on top of each other is a state no user asked for.
  const open = useCallback((next) => {
    setSurface((current) => (current === next ? current : next))
  }, [])

  const close = useCallback(() => {
    setSurface(null)
  }, [])

  const value = useMemo(
    () => ({
      surface,
      isSearchOpen: surface === SURFACE.search,
      isCartOpen: surface === SURFACE.cart,
      isMobileMenuOpen: surface === SURFACE.mobileMenu,
      isAnyOpen: surface !== SURFACE.none,
      open,
      close,
    }),
    [close, open, surface],
  )

  return <NavbarUiContext.Provider value={value}>{children}</NavbarUiContext.Provider>
}

/**
 * Read the navbar's UI state.
 *
 * Returns an inert value outside the provider so a component that can render
 * without the header — the mobile tab bar, an error boundary — still works.
 */
export function useNavbarUi() {
  const context = useContext(NavbarUiContext)

  return (
    context ?? {
      surface: SURFACE.none,
      isSearchOpen: false,
      isCartOpen: false,
      isMobileMenuOpen: false,
      isAnyOpen: false,
      open: () => {},
      close: () => {},
    }
  )
}