import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context.js'
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from './auth-api.js'
import { ApiClientError } from '../../lib/api-client.js'
import { clearIntent } from '../cart/pending-intent.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initializationError, setInitializationError] = useState(null)

  useEffect(() => {
    let isActive = true

    async function restoreSession() {
      try {
        const { user: authenticatedUser } = await meRequest()
        if (isActive) {
          setUser(authenticatedUser)
        }
      } catch (error) {
        if (isActive && !(error instanceof ApiClientError && error.status === 401)) {
          setInitializationError(
            error instanceof Error ? error.message : 'Unable to restore your session.',
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { user: authenticatedUser } = await loginRequest(credentials)
    setInitializationError(null)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const register = useCallback(async (account) => {
    const { user: authenticatedUser } = await registerRequest(account)
    setInitializationError(null)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      // Any pending cart or wishlist intent belongs to the account that is ending, so
      // it is dropped here rather than left to fire under whoever signs in next.
      clearIntent()
      setUser(null)
    }
  }, [])

  /**
   * Folds a fresh user payload from the API into the session, so a profile edit or
   * an email verification is reflected everywhere without a full page reload.
   */
  const updateUser = useCallback((nextUser) => {
    if (nextUser) {
      setUser(nextUser)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      initializationError,
      login,
      register,
      logout,
      updateUser,
    }),
    [initializationError, isLoading, login, logout, register, updateUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
