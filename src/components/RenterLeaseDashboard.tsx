import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Lease, Property } from '../types/database'
import { Session } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import ReviewSystem from './ReviewSystem'
import { COLORS, SPACING, FONTS } from '../theme/theme'

const IS_WEB = Platform.OS === 'web'

interface RenterLeaseDashboardProps {
  session: Session
  isDemo?: boolean
}

export default function RenterLeaseDashboard({ session, isDemo }: RenterLeaseDashboardProps) {
  const { t } = useTranslation()
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState<{ propertyId: string; leaseId: string } | null>(null)

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
      setLeases(data || [])
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

  const renderLeaseCard = (lease: any) => {
    const isCompleted = lease.status === 'completed'
    const property = lease.properties

    return (
      <View key={lease.id} style={styles.leaseCard}>
        <View style={styles.leaseHeader}>
          <Text style={styles.propertyAddress}>{property?.address || 'Property'}</Text>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.statusText, isCompleted && styles.statusTextCompleted]}>
              {lease.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.leaseDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Monthly Rent</Text>
            <Text style={styles.detailValue}>
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(lease.monthly_rent || 0)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>
              {lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {isCompleted && (
          <TouchableOpacity
            style={styles.rateButton}
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
              onSubmitSuccess={() => {
                setShowRatingModal(null)
                // Optionally refresh or show success
              }}
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
    padding: SPACING.md,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  leaseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  leaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  propertyAddress: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.cardBackground,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  statusTextCompleted: {
    color: COLORS.primary,
  },
  leaseDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
    fontFamily: FONTS.medium,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
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
