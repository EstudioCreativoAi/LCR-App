import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { loadStripe } from '@stripe/stripe-js'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import { createPaymentIntent, confirmPayment } from '../../src/services/paymentService'
import { formatPrice } from '../../src/utils/currency'
import { COLORS, SPACING, FONTS } from '../../src/theme/theme'
import CaboCelebration from '../../src/components/CaboCelebration'
import type { Lease, Property, Profile } from '../../src/types/database'

type Phase = 'summary' | 'processing' | 'celebration'

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

const DEMO_LEASE = {
  id: 'demo-lease-1',
  property_id: 'demo-prop-1',
  renter_id: 'demo-renter',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  status: 'active',
  monthly_rent: 25000,
  deposit_amount: 25000,
  envelope_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEMO_PROPERTY = {
  id: 'demo-prop-1',
  address: '123 Calle Marina, Cabo San Lucas',
  city: 'Cabo San Lucas',
  description: 'Modern Oceanfront Villa',
  photos: [],
  monthly_rent_mxn: 25000,
  property_type: 'Villa',
  bedrooms: 3,
  bathrooms: 2,
}

const DEMO_LANDLORD = {
  full_name: 'Carlos Rodriguez',
}

export default function PaymentScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>()
  const { session, isDemo } = useSession()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('summary')
  const [lease, setLease] = useState<Lease | null>(null)
  const [property, setProperty] = useState<Partial<Property> | null>(null)
  const [landlord, setLandlord] = useState<Partial<Profile> | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [firstName, setFirstName] = useState('')

  const fetchLeaseData = useCallback(async () => {
    try {
      if (isDemo) {
        setLease(DEMO_LEASE as any)
        setProperty(DEMO_PROPERTY as any)
        setLandlord(DEMO_LANDLORD as any)
        setFirstName('Demo')
        setLoading(false)
        return
      }

      const { data: leaseData, error: leaseError } = await (supabase
        .from('leases') as any)
        .select(`
          *,
          properties:property_id(
            id, address, city, description, photos, monthly_rent_mxn,
            property_type, bedrooms, bathrooms, landlord_id
          )
        `)
        .eq('id', leaseId)
        .single()

      if (leaseError || !leaseData) {
        throw new Error('Lease not found')
      }

      setLease(leaseData)
      setProperty(leaseData.properties)

      if (leaseData.properties?.landlord_id) {
        const { data: landlordData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', leaseData.properties.landlord_id)
          .single()
        setLandlord(landlordData)
      }

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, full_name')
          .eq('id', session.user.id)
          .single()
        setFirstName(profile?.first_name || profile?.full_name?.split(' ')[0] || '')
      }
    } catch (error: any) {
      console.error('Error fetching lease data:', error)
      Alert.alert('Error', 'Failed to load payment details.')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [leaseId, isDemo, session])

  useEffect(() => {
    fetchLeaseData()
  }, [fetchLeaseData])

  const handlePayDeposit = async () => {
    if (!lease || !session) return

    setPaying(true)

    try {
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        setPhase('celebration')
        setPaying(false)
        return
      }

      setPhase('processing')

      // 1. Create payment intent via Edge Function
      const { clientSecret, paymentId } = await createPaymentIntent(lease.id, session.user.id)

      // 2. Load Stripe.js and confirm payment
      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY)
      if (!stripe) throw new Error('Failed to load Stripe')

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            // Stripe.js will render its own secure card input in the redirect
            // For web, we use redirect-based confirmation
            token: undefined as any,
          },
        },
        return_url: `${window.location.origin}/pay/${leaseId}?status=success`,
      })

      if (stripeError) {
        if (stripeError.type === 'card_error' || stripeError.type === 'validation_error') {
          throw new Error(stripeError.message || 'Card error')
        }
        throw new Error(stripeError.message || 'Payment failed')
      }

      if (paymentIntent?.status === 'succeeded') {
        // 3. Confirm payment via Edge Function
        await confirmPayment(paymentId, paymentIntent.id)
        setPhase('celebration')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.')
      setPhase('summary')
    } finally {
      setPaying(false)
    }
  }

  const handleDismissCelebration = () => {
    router.replace('/(tabs)/leases')
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (phase === 'celebration') {
    return (
      <CaboCelebration
        firstName={firstName}
        onDismiss={handleDismissCelebration}
      />
    )
  }

  const depositAmount = lease?.deposit_amount || lease?.monthly_rent || 0
  const monthlyRent = lease?.monthly_rent || 0
  const leaseMonths = lease?.start_date && lease?.end_date
    ? Math.round((new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (30.44 * 86400000))
    : 12
  const photoUrl = (property as any)?.photos?.[0]

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Property Hero Image */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.heroImage} />
        ) : (
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            style={styles.heroImage}
          >
            <Text style={styles.heroPlaceholder}>🏠</Text>
          </LinearGradient>
        )}

        {/* Payment Summary Card */}
        <View style={styles.card}>
          <Text style={styles.propertyAddress}>
            {property?.address || 'Property'}
          </Text>
          <Text style={styles.propertyCity}>{property?.city}</Text>

          <View style={styles.divider} />

          <Text style={styles.depositLabel}>SECURITY DEPOSIT</Text>
          <Text style={styles.depositAmount}>{formatPrice(depositAmount)}</Text>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Monthly Rent</Text>
            <Text style={styles.breakdownValue}>{formatPrice(monthlyRent)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Lease Term</Text>
            <Text style={styles.breakdownValue}>{leaseMonths} months</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Landlord</Text>
            <Text style={styles.breakdownValue}>{landlord?.full_name || '—'}</Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, paying && styles.payButtonDisabled]}
          onPress={handlePayDeposit}
          disabled={paying}
          activeOpacity={0.8}
        >
          {paying ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payButtonText}>
              Pay Deposit — {formatPrice(depositAmount)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Stripe Badge */}
        <View style={styles.stripeBadge}>
          <Text style={styles.stripeBadgeText}>🔒 Secured by Stripe</Text>
        </View>
      </ScrollView>

      {/* Processing Overlay */}
      {phase === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.processingText}>Processing payment...</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  heroImage: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholder: {
    fontSize: 64,
    opacity: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: -30,
    borderRadius: 24,
    padding: SPACING.xl,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  propertyAddress: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  propertyCity: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginVertical: SPACING.md,
  },
  depositLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 1.5,
  },
  depositAmount: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.text,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.muted,
  },
  breakdownValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  stripeBadge: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  stripeBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
})
