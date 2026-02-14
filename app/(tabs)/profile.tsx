import React, { useEffect, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import * as profileService from '../../src/services/profileService'
import type { Profile } from '../../src/types/database'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'

const CARD_BORDER_RADIUS = 20
const AVATAR_SIZE = 88
const FLIP_DURATION = 500

// ─── Hooks ───────────────────────────────────────────────

function useProfileData(userId: string | undefined, isDemo: boolean) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ listings: 0, applications: 0, rating: 0 })

  const reload = useCallback(() => {
    if (!userId || isDemo) {
      setProfile({
        id: 'demo-user-id',
        role: 'renter',
        full_name: 'Demo User',
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@caborentals.com',
        phone_number: null,
        bio: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setStats({ listings: 3, applications: 5, rating: 4.8 })
      return
    }

    profileService.fetchProfile(userId).then((p) => {
      if (p) setProfile(p)
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

  useEffect(() => {
    reload()
  }, [reload])

  return { profile, setProfile, stats, reload }
}

// ─── Sub-components ──────────────────────────────────────

function HolographicShine() {
  const shimmer = useSharedValue(0)

  useEffect(() => {
    shimmer.value = withTiming(0, { duration: 0 })
    const run = () => {
      shimmer.value = withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }, () => {
        shimmer.value = 0
        runOnJS(run)()
      })
    }
    run()
  }, [shimmer])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 400]) }],
  }))

  return (
    <Animated.View style={[styles.shine, animatedStyle]}>
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
        style={[styles.menuItemText, destructive && styles.menuItemDestructive]}
      >
        {label}
      </Text>
      <Text style={[styles.menuChevron, destructive && styles.menuItemDestructive]}>
        {'>'}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Verified Stamp Overlay ──────────────────────────────

function VerifiedStamp({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      opacity.value = 1
      scale.value = withSpring(1, { damping: 8, stiffness: 180 })
      opacity.value = withDelay(1200, withTiming(0, { duration: 600 }))
      scale.value = withDelay(1200, withTiming(0, { duration: 600 }))
    }
  }, [visible, scale, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  if (!visible) return null

  return (
    <Animated.View style={[styles.stampOverlay, animatedStyle]}>
      <View style={styles.stampCircle}>
        <Text style={styles.stampText}>VERIFIED</Text>
      </View>
    </Animated.View>
  )
}

// ─── Main Screen ─────────────────────────────────────────

export default function ProfileScreen() {
  const { session, role, isDemo, signOut } = useSession()
  const router = useRouter()
  const { profile, setProfile, stats, reload } = useProfileData(session?.user.id, isDemo)

  // Flip state
  const [isEditing, setIsEditing] = useState(false)
  const flipProgress = useSharedValue(0)

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null)

  // Stamp state
  const [showStamp, setShowStamp] = useState(false)

  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'User'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : ''

  const isVerified =
    !isDemo &&
    !!profile?.first_name &&
    !!profile?.last_name &&
    !!profile?.avatar_url

  const isRenter = role === 'renter'
  const isAgent = role === 'agent'

  // ── Animation styles ──

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180])
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    }
  })

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360])
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    }
  })

  // ── Handlers ──

  function handleEdit() {
    setEditFirstName(profile?.first_name ?? '')
    setEditLastName(profile?.last_name ?? '')
    setEditPhone(profile?.phone_number ?? '')
    setEditBio(profile?.bio ?? '')
    setLocalAvatarUri(null)
    setIsEditing(true)
    flipProgress.value = withTiming(1, {
      duration: FLIP_DURATION,
      easing: Easing.inOut(Easing.ease),
    })
  }

  function handleCancel() {
    setLocalAvatarUri(null)
    flipProgress.value = withTiming(0, {
      duration: FLIP_DURATION,
      easing: Easing.inOut(Easing.ease),
    }, () => {
      runOnJS(setIsEditing)(false)
    })
  }

  async function handleSave() {
    if (!session?.user.id) return

    if (isDemo) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: editFirstName || null,
              last_name: editLastName || null,
              full_name: [editFirstName, editLastName].filter(Boolean).join(' ') || null,
              phone_number: editPhone || null,
              bio: editBio || null,
              avatar_url: localAvatarUri || prev.avatar_url,
            }
          : prev
      )
      const nowVerified =
        !!editFirstName && !!editLastName && !!(localAvatarUri || profile?.avatar_url)
      flipProgress.value = withTiming(0, {
        duration: FLIP_DURATION,
        easing: Easing.inOut(Easing.ease),
      }, () => {
        runOnJS(setIsEditing)(false)
        if (nowVerified) {
          runOnJS(setShowStamp)(true)
        }
      })
      return
    }

    setSaving(true)
    const result = await profileService.updateProfile(session.user.id, {
      first_name: editFirstName || null,
      last_name: editLastName || null,
      phone_number: editPhone || null,
      bio: editBio || null,
    })
    setSaving(false)

    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Failed to save profile.')
      return
    }

    reload()

    const nowVerified =
      !!editFirstName &&
      !!editLastName &&
      !!(localAvatarUri || profile?.avatar_url)

    flipProgress.value = withTiming(0, {
      duration: FLIP_DURATION,
      easing: Easing.inOut(Easing.ease),
    }, () => {
      runOnJS(setIsEditing)(false)
      if (nowVerified) {
        runOnJS(setShowStamp)(true)
      }
    })
  }

  async function handleAvatarUpload() {
    if (!session?.user.id) return

    if (isDemo) {
      setLocalAvatarUri('https://i.pravatar.cc/200?u=demo')
      return
    }

    setUploadingAvatar(true)
    try {
      const result = await profileService.uploadAvatar(session.user.id)
      if (result.success && result.publicUrl) {
        setLocalAvatarUri(result.publicUrl)
        setProfile((prev) => (prev ? { ...prev, avatar_url: result.publicUrl! } : prev))
      } else if (result.error && result.error !== 'No image selected') {
        Alert.alert('Upload Error', result.error)
      }
    } catch (e) {
      Alert.alert('Upload Error', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  // Reset stamp after it plays
  useEffect(() => {
    if (showStamp) {
      const timer = setTimeout(() => setShowStamp(false), 2200)
      return () => clearTimeout(timer)
    }
  }, [showStamp])

  const currentAvatarUrl = localAvatarUri || profile?.avatar_url

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      {/* === FLIP CARD === */}
      <View style={styles.cardOuter}>
        {/* FRONT FACE */}
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          <LinearGradient
            colors={['#D55E46', '#D5B58F', '#E5DCCD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <HolographicShine />

            <View style={styles.cardTopRow}>
              <Text style={styles.cardBrand}>LCR</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>VERIFIED</Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedBadge}>
                    <Text style={styles.unverifiedText}>UNVERIFIED</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.editBadge} onPress={handleEdit}>
                  <Text style={styles.editBadgeText}>EDIT</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.avatarContainer}>
                {currentAvatarUrl ? (
                  <Image source={{ uri: currentAvatarUrl }} style={styles.avatar} />
                ) : (
                  <AvatarInitials name={displayName} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.cardEmail} numberOfLines={1}>
                  {profile?.email || session?.user.email}
                </Text>
                <View style={styles.cardRolePill}>
                  <Text style={styles.cardRoleText}>
                    {role?.toUpperCase() ?? 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterLabel}>MEMBER SINCE</Text>
              <Text style={styles.cardFooterValue}>{memberSince}</Text>
            </View>
          </LinearGradient>

          <VerifiedStamp visible={showStamp} />
        </Animated.View>

        {/* BACK FACE (Edit Form) */}
        <Animated.View style={[styles.cardFace, styles.cardFaceBack, backAnimatedStyle]}>
          <LinearGradient
            colors={['#D5B58F', '#D55E46', '#E5DCCD']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardGradient}
          >
            <HolographicShine />

            <Text style={styles.backTitle}>Edit Profile</Text>

            {/* Avatar upload */}
            <TouchableOpacity
              style={styles.backAvatarContainer}
              onPress={handleAvatarUpload}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <View style={styles.avatarFallback}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                </View>
              ) : currentAvatarUrl ? (
                <Image source={{ uri: currentAvatarUrl }} style={styles.avatar} />
              ) : (
                <AvatarInitials name={editFirstName || displayName} />
              )}
              <View style={styles.avatarEditHint}>
                <Text style={styles.avatarEditHintText}>TAP</Text>
              </View>
            </TouchableOpacity>

            {/* Form fields */}
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                placeholder="First Name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={editFirstName}
                onChangeText={setEditFirstName}
              />
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                placeholder="Last Name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={editLastName}
                onChangeText={setEditLastName}
              />
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="+52..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              placeholder="Bio (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={3}
            />

            {/* Action buttons */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
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
            <StatChip
              label="Avg Rating"
              value={stats.rating > 0 ? String(stats.rating) : '--'}
            />
          </>
        ) : (
          <>
            <StatChip label="Listings" value={String(stats.listings)} />
            <StatChip label="Applications" value={String(stats.applications)} />
            {isAgent && (
              <StatChip
                label="Avg Rating"
                value={stats.rating > 0 ? String(stats.rating) : '--'}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* === MENU === */}
      <View style={styles.menuCard}>
        <MenuItem label="Edit Profile" onPress={handleEdit} />
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
          onPress={() =>
            Alert.alert('Coming Soon', 'Notification settings will be available soon.')
          }
        />
        <MenuItem
          label="Language"
          onPress={() =>
            Alert.alert('Coming Soon', 'Language settings will be available soon.')
          }
        />
        <MenuItem label="Sign Out" onPress={handleSignOut} destructive />
      </View>
    </ScrollView>
  )
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },

  // ── Flip Card Container ──
  cardOuter: {
    borderRadius: CARD_BORDER_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFace: {
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
  cardFaceBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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

  // ── Front Face ──
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
  editBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  editBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.white,
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

  // ── Verified Stamp ──
  stampOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  stampCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(213, 94, 70, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  stampText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 3,
  },

  // ── Back Face (Edit Form) ──
  backTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  backAvatarContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  avatarEditHint: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEditHintText: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  formTextarea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
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
