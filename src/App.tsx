import 'react-native-url-polyfill/auto'
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native'
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { UserRole } from './types/database'
import AuthScreen from './screens/AuthScreen'
import PropertyFeed from './components/PropertyFeed'
import CreateListing from './components/CreateListing'
import LeadDashboard from './components/LeadDashboard'
import RenterLeaseDashboard from './components/RenterLeaseDashboard'
import CommissionTracker from './components/CommissionTracker'
import NotificationCenter from './components/NotificationCenter'
import i18n from './i18n'
import { useTranslation } from 'react-i18next'
import { COLORS, SPACING, FONTS } from './theme/theme'

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  })

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

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (loading) {
     return (
       <View style={styles.loadingContainer}>
         <ActivityIndicator size="large" color={COLORS.primary} />
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
          isDemo={isDemo}
          onSignOut={handleSignOut}
        />
      ) : (
        <AuthScreen onEnterDemo={handleEnterDemo} />
      )}
    </View>
  )
}

function HomeScreen({ session, role, isDemo, onSignOut }: { session: Session; role: UserRole; isDemo: boolean; onSignOut: () => void }) {
  const { t } = useTranslation()
  const [showCreateListing, setShowCreateListing] = useState(false)
  const [activeTab, setActiveTab] = useState<'feed' | 'leads' | 'commissions' | 'renter_leases'>('feed')
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    const channel = supabase
      .channel('unread_notifs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
    
    if (!error) setUnreadCount(count || 0)
  }

  const handleNotificationAction = (type: string, metadata: any) => {
    setShowNotifications(false)
    if (type === 'new_message' || type === 'lead_update') {
      setActiveTab('leads')
      // Additional logic could be added to auto-open specific lead chat if needed
    } else if (type === 'lease_signed') {
      setActiveTab('commissions')
    }
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <SafeAreaView style={styles.homeContainer}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>LCR App</Text>
            <Text style={styles.headerSubtitle}>{session.user.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage}>
                <Text style={styles.languageToggleText}>{i18n.language.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={styles.notificationBell}
              onPress={() => setShowNotifications(true)}
            >
              <Text style={{ fontSize: 24 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {(role === 'landlord' || role === 'agent') && (
              <TouchableOpacity
                style={styles.createListingButton}
                onPress={() => setShowCreateListing(true)}
              >
                <Text style={styles.createListingButtonText}>+ {t('common.new')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={onSignOut}
            >
              <Text style={styles.signOutButtonText}>{t('common.signOut')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>{t('common.properties')}</Text>
          </TouchableOpacity>
          
          {(role === 'landlord' || role === 'agent') && (
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'leads' && styles.tabActive]}
              onPress={() => setActiveTab('leads')}
            >
              <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>{t('common.leads')}</Text>
            </TouchableOpacity>
          )}

          {role === 'renter' && (
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'renter_leases' && styles.tabActive]}
              onPress={() => setActiveTab('renter_leases')}
            >
              <Text style={[styles.tabText, activeTab === 'renter_leases' && styles.tabTextActive]}>My Leases</Text>
            </TouchableOpacity>
          )}
          
          {role === 'agent' && (
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'commissions' && styles.tabActive]}
              onPress={() => setActiveTab('commissions')}
            >
              <Text style={[styles.tabText, activeTab === 'commissions' && styles.tabTextActive]}>{t('common.earnings')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'feed' ? (
          <PropertyFeed role={role} isDemo={isDemo} />
        ) : activeTab === 'leads' ? (
          <LeadDashboard isDemo={isDemo} session={session} />
        ) : activeTab === 'renter_leases' ? (
          <RenterLeaseDashboard isDemo={isDemo} session={session} />
        ) : (
          <CommissionTracker isDemo={isDemo} />
        )}
      </View>

      {/* Modal-like Overlay for Create Listing */}
      {showCreateListing && (
        <CreateListing 
          onClose={() => setShowCreateListing(false)}
          onSuccess={() => {
            setShowCreateListing(false)
            setActiveTab('feed')
          }}
        />
      )}

      {/* Notification Center Overlay */}
      {showNotifications && (
        <NotificationCenter
          userId={session.user.id}
          onClose={() => setShowNotifications(false)}
          onAction={handleNotificationAction}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeContainer: {
    flex: 1,
    backgroundColor: COLORS.muted,
  },
  headerWrapper: {
    width: '100%',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    zIndex: 10,
  },
  header: {
    width: '100%',
    maxWidth: 800,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  roleBadge: {
    backgroundColor: COLORS.cardBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  signOutButtonText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  createListingButton: {
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createListingButtonText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 800,
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  notificationBell: {
    padding: 6,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    paddingHorizontal: 2,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: FONTS.bold,
  },
  languageToggle: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  languageToggleText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
})
