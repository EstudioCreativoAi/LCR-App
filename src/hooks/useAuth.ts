import { useState, useEffect, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import * as authService from '../services/authService'
import type { UserRole, SignUpParams } from '../services/authService'

export interface UseAuthReturn {
  session: Session | null
  user: User | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (params: SignUpParams) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authService.getSession().then((sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
      setIsLoading(false)
    })

    const { unsubscribe } = authService.onAuthStateChange((sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
    })

    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const result = await authService.signIn(email, password)

    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Sign in failed')
      return false
    }

    return true
  }, [])

  const signUp = useCallback(async (params: SignUpParams): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const result = await authService.signUp(params)

    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Sign up failed')
      return false
    }

    return true
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    await authService.signOut()
    setSession(null)
    setUser(null)
    setIsLoading(false)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    session,
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  }
}

export type { UserRole, SignUpParams }
