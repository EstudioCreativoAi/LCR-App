import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export type UserRole = 'renter' | 'landlord' | 'agent'

export interface SignUpParams {
  email: string
  password: string
  fullName: string
  role: UserRole
}

export interface AuthResult {
  success: boolean
  user?: User
  session?: Session
  error?: string
}

export async function signUp(params: SignUpParams): Promise<AuthResult> {
  const { email, password, fullName, role } = params

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    user: data.user ?? undefined,
    session: data.session ?? undefined,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
  }
}

export async function signOut(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(
  callback: (session: Session | null) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return { unsubscribe: () => data.subscription.unsubscribe() }
}
