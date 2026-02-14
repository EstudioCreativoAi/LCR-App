import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import type { Profile } from '../../src/types/database'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'

const CARD_BORDER_RADIUS = 20
const AVATAR_SIZE = 88

function useProfileData(userId: string | undefined, isDemo: boolean) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ listings: 0, applications: 0, rating: 0 })

  useEffect(() => {
    if (!userId || isDemo) {
      setProfile({
        id: 'demo-user-id',
        role: 'renter',
        full_name: 'Demo User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setStats({ listings: 3, applications: 5, rating: 4.8 })
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
      })

    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', userId)
      .then(({ count }) => {
        setStats((prev) => ({ ...prev, listings: count ?? 0 }))
      })

    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('renter_id', userId)
      .then(({ count }) => {
        setStats((prev) => ({ ...prev, applications: count ?? 0 }))
      })

    supabase
      .from('ratings')
      .select('rating')
      .eq('rater_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
          setStats((prev) => ({ ...prev, rating: Math.round(avg * 10) / 10 }))
        }
      })
  }, [userId, isDemo])

  return { profile, stats }
}

function HolographicShine() {
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start()
  }, [shimmer])

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  })

  return (
    <Animated.View
      style={[
        styles.shine,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255,255,255,0.08)',
          'rgba(255,255,255,0.18)',
          'rgba(255,255,255,0.08)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  )
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.accent]}
      style={styles.avatarFallback}
    >
      <Text style={styles.avatarInitials}>{initials || '?'}</Text>
    </LinearGradient>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function MenuItem({
  label,
  onPress,
  destructive,
}: {
  label: string
  onPress: () => void
  destructive?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text
        style={[
          styles.menuItemText,
          destructive && styles.menuItemDestructive,
        ]}
      >
        {label}
      </Text>
      <Text style={[styles.menuChevron, destructive && styles.menuItemDestructive]}>
        {'>'}
      </Text>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const { session, role, isDemo, signOut } = useSession()
  const router = useRouter()
  const { profile, stats } = useProfileData(session?.user.id, isDemo)

  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'User'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : ''

  const isVerified = !isDemo && !!profile?.full_name && !!profile?.avatar_url
  const isRenter = role === 'renter'
  const isAgent = role === 'agent'

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      {/* === ID CARD === */}
      <View style={styles.cardOuter}>
        <LinearGradient
          colors={['#D55E46', '#D5B58F', '#E5DCCD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <HolographicShine />

          {/* Card top row: logo + badge */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardBrand}>LCR</Text>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Text style={styles.unverifiedText}>UNVERIFIED</Text>
              </View>
            )}
          </View>

          {/* Avatar + info row */}
          <View style={styles.cardBody}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <AvatarInitials name={displayName} />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.cardEmail} numberOfLines={1}>
                {session?.user.email}
              </Text>
              <View style={styles.cardRolePill}>
                <Text style={styles.cardRoleText}>
                  {role?.toUpperCase() ?? 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Card footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterLabel}>MEMBER SINCE</Text>
            <Text style={styles.cardFooterValue}>{memberSince}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* === STAT CHIPS === */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {isRenter ? (
          <>
            <StatChip label="Applications" value={String(stats.applications)} />
            <StatChip label="Avg Rating" value={stats.rating > 0 ? String(stats.rating) : '--'} />
          </>
        ) : (
          <>
            <StatChip label="Listings" value={String(stats.listings)} />
            <StatChip label="Applications" value={String(stats.applications)} />
            {isAgent && (
              <StatChip label="Avg Rating" value={stats.rating > 0 ? String(stats.rating) : '--'} />
            )}
          </>
        )}
      </ScrollView>

      {/* === MENU === */}
      <View style={styles.menuCard}>
        <MenuItem
          label="Edit Profile"
          onPress={() => {
            Alert.alert('Coming Soon', 'Profile editing will be available in the next update.')
          }}
        />
        {isRenter ? (
          <MenuItem
            label="My Applications"
            onPress={() => router.push('/(tabs)/leases')}
          />
        ) : (
          <MenuItem
            label="My Listings"
            onPress={() => router.push('/(tabs)/my-listings')}
          />
        )}
        <MenuItem
          label="Notification Preferences"
          onPress={() => {
            Alert.alert('Coming Soon', 'Notification settings will be available soon.')
          }}
        />
        <MenuItem
          label="Language"
          onPress={() => {
            Alert.alert('Coming Soon', 'Language settings will be available soon.')
          }}
        />
        <MenuItem
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },

  // ── ID Card ──
  cardOuter: {
    borderRadius: CARD_BORDER_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: CARD_BORDER_RADIUS,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
    zIndex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardBrand: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 3,
    opacity: 0.9,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  verifiedText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  unverifiedText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitials: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.sm,
  },
  cardRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardRoleText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooterLabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  cardFooterValue: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },

  // ── Stat Chips ──
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.lg,
    paddingHorizontal: 2,
  },
  statChip: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Menu ──
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  menuItemDestructive: {
    color: COLORS.primary,
  },
  menuChevron: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
})
