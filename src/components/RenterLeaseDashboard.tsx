import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import { fetchDepositPayment } from '../services/paymentService'
import ReviewSystem from './ReviewSystem'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { formatPrice } from '../utils/currency'

interface RenterLeaseDashboardProps {
  session: Session
  isDemo?: boolean
}

function getNextRentDue(startDate: string): string {
  const start = new Date(startDate)
  const next = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function RenterLeaseDashboard({ session, isDemo }: RenterLeaseDashboardProps) {
  const router = useRouter()
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState<{ propertyId: string; leaseId: string } | null>(null)
  const [depositPaidMap, setDepositPaidMap] = useState<Record<string, boolean>>({})

  const fetchLeases = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await (supabase
        .from('leases') as any)
        .select(`
          *,
          properties:property_id(*)
        `)
        .eq('renter_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      let result = data || []
      if (isDemo && result.length === 0) {
        result = [
          {
            id: 'demo-lease-1',
            property_id: 'demo-prop-1',
            renter_id: session.user.id,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'sent_for_signature',
            monthly_rent: 45000,
            deposit_amount: 90000,
            envelope_id: null,
            signature_url: null,
            document_url: null,
            signed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            properties: {
              address: 'El Tezal, Cabo San Lucas',
              city: 'Cabo San Lucas',
              description: 'Modern Villa with Ocean View',
            },
          },
        ]
      }
      setLeases(result)

      // Check deposit payment status for each lease
      if (!isDemo) {
        const paidMap: Record<string, boolean> = {}
        for (const l of result) {
          const payment = await fetchDepositPayment(l.id)
          paidMap[l.id] = !!payment
        }
        setDepositPaidMap(paidMap)
      }
    } catch (error) {
      console.error('Error fetching renter leases:', error)
      if (!isDemo) Alert.alert('Error', 'Failed to load your leases.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session.user.id, isDemo])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLeases()
  }

  const handlePayDeposit = (leaseId: string) => {
    router.push(`/pay/${leaseId}`)
  }

  const handleSignLease = (leaseId: string) => {
    router.push(`/sign/${leaseId}`)
  }

  const handleViewLease = (documentUrl?: string | null) => {
    if (documentUrl) {
      if (Platform.OS === 'web') {
        window.open(documentUrl, '_blank')
      } else {
        Linking.openURL(documentUrl)
      }
    } else {
      Alert.alert('No Document', 'The signed lease document is not available yet.')
    }
  }

  const handleContactLandlord = () => {
    Alert.alert('Coming Soon', 'Messaging will be available in a future update.')
  }

  const renderLeaseCard = (lease: any) => {
    const isCompleted = lease.status === 'completed'
    const isActive = lease.status === 'active'
    const needsSignature = lease.status === 'sent_for_signature'
    const hasSigned = !!lease.document_url
    const property = lease.properties
    const propertyTitle = property?.description?.slice(0, 50) || property?.address || 'Property'
    const hasDepositPaid = depositPaidMap[lease.id] || false
    const depositStatus = hasDepositPaid ? 'Paid' : 'Pending'
    const nextRentDue = lease.start_date ? getNextRentDue(lease.start_date) : 'N/A'

    const statusBadgeStyle = [
      styles.statusBadge,
      { backgroundColor: COLORS.cardBackground },
    ]
    const statusTextStyle = [
      styles.statusText,
      isActive && { color: COLORS.primary },
      isCompleted && { color: COLORS.secondary },
      !isActive && !isCompleted && { color: COLORS.accent },
    ]

    return (
      <View key={lease.id} style={{ marginBottom: SPACING.xl }}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>
            {leases.length === 1 ? 'My Lease' : property?.address || 'Lease'}
          </Text>
          <View style={statusBadgeStyle}>
            <Text style={statusTextStyle}>{lease.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Property Overview Card */}
        <TouchableOpacity style={styles.card} onPress={handleViewLease} activeOpacity={0.8}>
          <Text style={styles.propertyTitle}>{propertyTitle}</Text>
          <Text style={styles.address}>📍 {property?.address || '—'}, {property?.city || ''}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.value}>
                {lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Monthly Rent</Text>
              <Text style={styles.value}>
                {formatPrice(lease.monthly_rent || 0)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Sign Lease CTA */}
        {needsSignature && (
          <TouchableOpacity
            style={styles.signLeaseButton}
            onPress={() => handleSignLease(lease.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.signLeaseText}>✍️  Sign Lease</Text>
          </TouchableOpacity>
        )}

        {/* Financials Section */}
        <Text style={styles.sectionTitle}>Financials</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.infoLabel}>Security Deposit</Text>
            <Text style={[styles.infoValue, { color: depositStatus === 'Paid' ? COLORS.primary : COLORS.muted }]}>
              {depositStatus}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: SPACING.md }]}>
            <Text style={styles.infoLabel}>Next Rent Due</Text>
            <Text style={styles.infoValue}>{nextRentDue}</Text>
          </View>

          {isActive && !hasDepositPaid && (
            <TouchableOpacity style={styles.payButton} onPress={() => handlePayDeposit(lease.id)}>
              <Text style={styles.payButtonText}>Pay Deposit — {formatPrice(lease.deposit_amount || 0)}</Text>
            </TouchableOpacity>
          )}
          {isActive && hasDepositPaid && (
            <View style={styles.depositPaidBadge}>
              <Text style={styles.depositPaidText}>Deposit Paid ✓</Text>
            </View>
          )}
        </View>

        {/* Management Section */}
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => handleViewLease(lease.document_url)}
          >
            <Text style={styles.actionIcon}>{hasSigned ? '📄' : '📝'}</Text>
            <Text style={styles.actionText}>{hasSigned ? 'View Signed Lease' : 'View Lease'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallCard} onPress={handleContactLandlord}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Contact Landlord</Text>
          </TouchableOpacity>
        </View>

        {isCompleted && (
          <TouchableOpacity
            style={[styles.rateButton, { marginTop: SPACING.lg }]}
            onPress={() => setShowRatingModal({ propertyId: lease.property_id, leaseId: lease.id })}
          >
            <Text style={styles.rateButtonText}>★ Rate Your Stay</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>My Leases</Text>
        <Text style={styles.subtitle}>Manage your current and previous rentals</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : leases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No leases found</Text>
            <Text style={styles.emptyText}>Any properties you rent will appear here once the lease is active.</Text>
          </View>
        ) : (
          leases.map(renderLeaseCard)
        )}
      </ScrollView>

      {showRatingModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ReviewSystem
              raterId={session.user.id}
              propertyId={showRatingModal.propertyId}
              category="property"
              onSubmitSuccess={() => setShowRatingModal(null)}
              onCancel={() => setShowRatingModal(null)}
            />
          </View>
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  propertyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  address: {
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.muted,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 2,
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
  signLeaseButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  signLeaseText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  payButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    fontSize: 16,
  },
  depositPaidBadge: {
    backgroundColor: COLORS.cardBackground,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  depositPaidText: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  rateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  rateButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.md,
    zIndex: 2000,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
})
