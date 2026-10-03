import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context.js'
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from './auth-api.js'
import { ApiClientError } from '../../lib/api-client.js'

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
      setUser(null)
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
    }),
    [initializationError, isLoading, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
