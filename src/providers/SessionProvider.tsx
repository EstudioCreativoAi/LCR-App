import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, hasSupabaseConfig } from '../lib/supabase'
import type { UserRole } from '../types/database'

type SessionContextValue = {
  session: Session | null
  role: UserRole | null
  isDemo: boolean
  isLoading: boolean
  hasConfig: boolean
  enterDemo: (selectedRole: UserRole) => void
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return ctx
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setIsLoading(false)
      return
    }

    if (!hasSupabaseConfig) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) {
        fetchProfile(s.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isDemo) {
        setSession(s)
        if (s) {
          fetchProfile(s.user.id)
        } else {
          setRole(null)
          setIsLoading(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [isDemo])

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (data) setRole((data as any).role as UserRole)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function enterDemo(selectedRole: UserRole) {
    setIsDemo(true)
    setRole(selectedRole)
    setSession({
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'demo-user-id',
        email: 'demo@caborentals.com',
        app_metadata: {},
        user_metadata: { role: selectedRole },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    } as any)
    setIsLoading(false)
  }

  async function signOut() {
    if (isDemo) {
      setIsDemo(false)
      setSession(null)
      setRole(null)
    } else {
      await supabase.auth.signOut()
    }
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        role,
        isDemo,
        isLoading,
        hasConfig: hasSupabaseConfig,
        enterDemo,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}
