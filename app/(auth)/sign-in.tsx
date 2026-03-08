import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { useSession } from '../../src/providers/SessionProvider'
import type { UserRole } from '../../src/types/database'
import { COLORS, SPACING, FONTS } from '../../src/theme/theme'

export default function SignInScreen() {
  const { enterDemo } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('renter')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? window.location.origin + '/update-password'
          : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (error) throw error
      setResetSent(true)
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAuth() {
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role } },
        })

        if (error) throw error

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              role,
              updated_at: new Date().toISOString(),
            })

          if (profileError) console.error('Sign-up profile error:', profileError)

          Alert.alert(
            'Check your email!',
            'A confirmation link has been sent to ' +
              email +
              '. You must click it before you can sign in.'
          )
        }
      } else {
        console.log('[Auth] signInWithPassword starting…')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        console.log('[Auth] signInWithPassword returned', {
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          error: error?.message ?? null,
        })

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error(
              'Please confirm your email first! Check your inbox for the link.'
            )
          }
          throw error
        }

        if (!data.session) {
          throw new Error(
            'Sign-in succeeded but no session was returned. Please confirm your email or try again.'
          )
        }

        console.log('[Auth] Sign-in successful, session active. Waiting for navigation…')

        // Update role if user selected a different one
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile && profile.role !== role) {
          await supabase
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', data.user.id)
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An error occurred'
      Alert.alert('Auth Error', msg)
      console.error('Auth Full Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.header}>Los Cabos Rentals</Text>
          <Text style={styles.subHeader}>Reset your password</Text>

          {resetSent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Check your email! A password reset link has been sent to {email}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resetInstructions}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.authButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setShowForgotPassword(false)
              setResetSent(false)
            }}
          >
            <Text style={styles.toggleText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Los Cabos Rentals</Text>
        <Text style={styles.subHeader}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={COLORS.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>
            {isSignUp ? 'I am a:' : 'Sign in as:'}
          </Text>
          <View style={styles.roleSelector}>
            {(['renter', 'landlord', 'agent'] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleButton,
                  role === r && styles.roleButtonSelected,
                ]}
                onPress={() => setRole(r)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === r && styles.roleButtonTextSelected,
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.authButtonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => enterDemo(role)}
          disabled={loading}
        >
          <Text style={styles.demoButtonText}>Enter Demo</Text>
        </TouchableOpacity>

        {!isSignUp && (
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => {
              setShowForgotPassword(true)
              setResetSent(false)
            }}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subHeader: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  roleContainer: {
    marginBottom: SPACING.lg,
  },
  roleLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleButtonSelected: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  roleButtonTextSelected: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  authButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  toggleButton: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  toggleText: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  demoButton: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  demoButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  forgotText: {
    color: COLORS.muted,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  resetInstructions: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  successText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20,
  },
})
