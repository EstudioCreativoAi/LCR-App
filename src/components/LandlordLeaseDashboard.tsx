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
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { formatPrice } from '../utils/currency'
import { MapPin, FileText, Building, User } from 'lucide-react-native'

interface LandlordLeaseDashboardProps {
  session: Session
  isDemo?: boolean
}

type StatusKey = 'active' | 'pending' | 'completed' | 'sent_for_signature'

const STATUS_COLORS: Record<StatusKey, string> = {
  active: '#27AE60',
  pending: '#F2994A',
  completed: COLORS.muted,
  sent_for_signature: '#2D9CDB',
}

export default function LandlordLeaseDashboard({ session, isDemo }: LandlordLeaseDashboardProps) {
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeases = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await (supabase
        .from('leases') as any)
        .select(`
          *,
          properties:property_id(id, address, city, landlord_id, agent_id),
          renter:renter_id(id, full_name, email, avatar_url)
        `)
        .or(`properties.landlord_id.eq.${session.user.id},properties.agent_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      let result = data || []

      // Supabase embedded filters may return rows with null joins; filter them out
      result = result.filter((l: any) => l.properties !== null)

      if (isDemo && result.length === 0) {
        result = [
          {
            id: 'demo-lease-1',
            property_id: 'demo-prop-1',
            renter_id: 'demo-renter-1',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            monthly_rent: 45000,
            deposit_amount: 90000,
            document_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            properties: {
              id: 'demo-prop-1',
              address: 'El Tezal, Cabo San Lucas',
              city: 'Cabo San Lucas',
              landlord_id: session.user.id,
              agent_id: null,
            },
            renter: {
              id: 'demo-renter-1',
              full_name: 'Sarah Johnson',
              email: 'sarah@example.com',
              avatar_url: null,
            },
          },
        ]
      }
      setLeases(result)
    } catch (error) {
      console.error('Error fetching landlord leases:', error)
      if (!isDemo) Alert.alert('Error', 'Failed to load leases.')

      // Fallback: try using the service-layer query which uses landlord_id/agent_id columns on leases table
      try {
        const { data: fallbackData } = await (supabase
          .from('leases') as any)
          .select(`
            *,
            properties:property_id(id, address, city, landlord_id, agent_id),
            renter:renter_id(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })

        if (fallbackData) {
          const filtered = fallbackData.filter((l: any) => {
            const prop = l.properties
            return prop && (prop.landlord_id === session.user.id || prop.agent_id === session.user.id)
          })
          setLeases(filtered)
        }
      } catch (_) {
        // fallback also failed, keep empty
      }
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

  const handleViewDocument = (lease: any) => {
    if (lease.document_url) {
      if (Platform.OS === 'web') {
        window.open(lease.document_url, '_blank')
      } else {
        Linking.openURL(lease.document_url)
      }
    } else {
      Alert.alert('Pending Signature', 'The lease document is awaiting signatures and will be available once signed.')
    }
  }

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status as StatusKey] || COLORS.muted
  }

  const renderLeaseCard = (lease: any) => {
    const property = lease.properties
    const renter = lease.renter
    const statusColor = getStatusColor(lease.status)

    return (
      <View key={lease.id} style={styles.card}>
        {/* Property info */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {property?.address || 'Property'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin size={14} color={COLORS.muted} strokeWidth={2} />
              <Text style={styles.address}>{property?.city || ''}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {lease.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Renter info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md }}>
          <View style={styles.renterAvatar}>
            <User size={16} color={COLORS.muted} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.label}>Renter</Text>
            <Text style={styles.renterName}>{renter?.full_name || 'Unknown Renter'}</Text>
          </View>
        </View>

        {/* Lease details */}
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Monthly Rent</Text>
            <Text style={styles.value}>{formatPrice(lease.monthly_rent || 0)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Lease Period</Text>
            <Text style={styles.value}>
              {lease.start_date ? new Date(lease.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              {' - '}
              {lease.end_date ? new Date(lease.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </Text>
          </View>
        </View>

        {/* View Document button */}
        <TouchableOpacity
          style={[styles.viewDocButton, !lease.document_url && styles.viewDocButtonDisabled]}
          onPress={() => handleViewDocument(lease)}
          activeOpacity={0.8}
        >
          <FileText size={18} color={lease.document_url ? COLORS.primary : COLORS.muted} strokeWidth={2} />
          <Text style={[styles.viewDocText, !lease.document_url && { color: COLORS.muted }]}>
            {lease.document_url ? 'View Document' : 'Pending signature'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Leases</Text>
        <Text style={styles.subtitle}>Manage leases for your properties</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : leases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building size={64} color={COLORS.muted} strokeWidth={2} style={{ marginBottom: SPACING.md, opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No active leases</Text>
            <Text style={styles.emptyText}>Leases for your properties will appear here</Text>
          </View>
        ) : (
          leases.map(renderLeaseCard)
        )}
      </ScrollView>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginVertical: SPACING.md,
  },
  renterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renterName: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
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
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  viewDocButtonDisabled: {
    borderColor: COLORS.muted,
    opacity: 0.6,
  },
  viewDocText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: SPACING.lg,
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
})
