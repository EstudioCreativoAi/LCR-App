import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Commission } from '../types/database'

const IS_WEB = Platform.OS === 'web'
const MAX_CONTENT_WIDTH = 800

interface CommissionWithLease extends Commission {
  leases: {
    id: string
    property_id: string
    renter_id: string
    properties: {
      address: string
      city: string
    }
  }
}

const MOCK_COMMISSIONS: any[] = [
  {
    id: 'comm-1',
    amount_mxn: 15000,
    status: 'paid',
    paid_at: new Date(2026, 0, 15).toISOString(),
    created_at: new Date(2026, 0, 10).toISOString(),
    leases: {
      properties: { address: 'Villa del Mar #45', city: 'Cabo San Lucas' },
      renter_id: 'renter-1'
    }
  },
  {
    id: 'comm-2',
    amount_mxn: 5250,
    status: 'paid',
    paid_at: new Date(2026, 1, 5).toISOString(),
    created_at: new Date(2026, 1, 1).toISOString(),
    leases: {
      properties: { address: 'Condo Pacifico Penthouse', city: 'San Jose del Cabo' },
      renter_id: 'renter-3'
    }
  },
  {
    id: 'comm-3',
    amount_mxn: 2775,
    status: 'pending',
    paid_at: null,
    created_at: new Date(2026, 1, 10).toISOString(),
    leases: {
      properties: { address: 'Baja Sands Loft', city: 'Cabo San Lucas' },
      renter_id: 'renter-4'
    }
  }
]

const MONTHS = [
  'All Time', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CommissionTracker({ isDemo }: { isDemo?: boolean }) {
  const [commissions, setCommissions] = useState<CommissionWithLease[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(0) // 0 = All Time

  const fetchCommissions = useCallback(async () => {
    try {
      if (isDemo) {
        setCommissions(MOCK_COMMISSIONS as any)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          leases!inner(
            *,
            properties!inner(address, city)
          )
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommissions(data as any || [])
    } catch (error) {
      console.error('Error fetching commissions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isDemo])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCommissions()
  }

  const filteredCommissions = commissions.filter(comm => {
    if (selectedMonth === 0) return true
    const date = new Date(comm.created_at)
    return date.getMonth() + 1 === selectedMonth
  })

  const totalEarned = filteredCommissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount_mxn), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Earned Commissions</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalEarned)}</Text>
          <View style={styles.summaryFooter}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Filtered by</Text>
              <Text style={styles.footerValue}>{MONTHS[selectedMonth]}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Total Rentals</Text>
              <Text style={styles.footerValue}>{filteredCommissions.length}</Text>
            </View>
          </View>
        </View>

        {/* Month Filter */}
        <Text style={styles.sectionTitle}>Filter by Month</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {MONTHS.map((month, index) => (
            <TouchableOpacity
              key={month}
              style={[styles.filterChip, selectedMonth === index && styles.filterChipActive]}
              onPress={() => setSelectedMonth(index)}
            >
              <Text style={[styles.filterChipText, selectedMonth === index && styles.filterChipTextActive]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Completed Rentals List */}
        <Text style={styles.sectionTitle}>Completed Rentals</Text>
        {filteredCommissions.map(comm => (
          <View key={comm.id} style={styles.commCard}>
            <View style={styles.commHeader}>
              <View style={styles.propertyInfo}>
                <Text style={styles.address}>{comm.leases.properties.address}</Text>
                <Text style={styles.renterName}>Renter ID: {comm.leases.renter_id.slice(0, 8)}...</Text>
              </View>
              <View style={[styles.statusBadge, comm.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                <Text style={styles.statusText}>{comm.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.commFooter}>
              <Text style={styles.date}>{new Date(comm.created_at).toLocaleDateString()}</Text>
              <Text style={styles.amount}>{formatCurrency(Number(comm.amount_mxn))}</Text>
            </View>
          </View>
        ))}

        {filteredCommissions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyTitle}>No commissions found</Text>
            <Text style={styles.emptyText}>You haven't earned any commissions for the selected period yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -1,
  },
  summaryFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
    gap: 32,
  },
  footerItem: {},
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  footerValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  filterBar: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: -4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  commCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  commHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
    marginRight: 12,
  },
  address: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  renterName: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  commFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
})
