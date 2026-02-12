import 'react-native-url-polyfill/auto'
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { UserRole } from './types/database'
import AuthScreen from './screens/AuthScreen'
import PropertyFeed from './components/PropertyFeed'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isDemo) {
        setSession(session)
        if (session) fetchProfile(session.user.id)
        else {
          setRole(null)
          setLoading(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [isDemo])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (data) setRole((data as any).role as UserRole)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnterDemo = (selectedRole: UserRole) => {
    setIsDemo(true)
    setRole(selectedRole)
    // Create a mock session that looks enough like a Supabase session
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
    setLoading(false)
  }

  const handleSignOut = async () => {
    if (isDemo) {
      setIsDemo(false)
      setSession(null)
      setRole(null)
    } else {
      await supabase.auth.signOut()
    }
  }

  if (loading) {
     return (
       <View style={styles.loadingContainer}>
         <ActivityIndicator size="large" color="#007AFF" />
       </View>
     )
  }

  return (
    <View style={styles.container}>
      {session && session.user ? (
        <HomeScreen 
          key={session.user.id} 
          session={session} 
          role={role || 'renter'}
          onSignOut={handleSignOut}
        />
      ) : (
        <AuthScreen onEnterDemo={handleEnterDemo} />
      )}
    </View>
  )
}

function HomeScreen({ session, role, onSignOut }: { session: Session; role: UserRole; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.homeContainer}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>LCR App</Text>
            <Text style={styles.headerSubtitle}>{session.user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={onSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Property Feed - role can be used for view-based logic inside */}
      <PropertyFeed role={role} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  headerWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    zIndex: 10,
  },
  header: {
    width: '100%',
    maxWidth: 800,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  roleBadge: {
    backgroundColor: '#EBF5FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007AFF',
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
  },
})
