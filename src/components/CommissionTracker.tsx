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
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { Commission } from '../types/database'
import { formatPrice } from '../utils/currency'

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
  const [chartHeight, setChartHeight] = useState(0)

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

  const chartSeries = (() => {
    const now = new Date()
    const monthsBack = 6
    const series = Array.from({ length: monthsBack }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1)
      return { year: d.getFullYear(), monthIndex: d.getMonth() }
    })

    const data = series.map(({ year, monthIndex }) => {
      const total = commissions
        .filter(c => c.status === 'paid')
        .filter(c => {
          const d = new Date(c.created_at)
          return d.getFullYear() === year && d.getMonth() === monthIndex
        })
        .reduce((sum, c) => sum + Number(c.amount_mxn), 0)

      return {
        label: new Date(year, monthIndex, 1).toLocaleString(undefined, { month: 'short' }),
        value: total,
      }
    })

    const maxValue = Math.max(...data.map(d => d.value), 1)
    return { data, maxValue }
  })()

  const totalEarned = filteredCommissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount_mxn), 0)

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={styles.summaryAmount}>{formatPrice(totalEarned)}</Text>
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

        {/* Commission Tracker Chart */}
        <Text style={styles.sectionTitle}>Commission Tracker</Text>
        <View style={styles.chartCard}>
          <View
            style={styles.chartArea}
            onLayout={(e) => setChartHeight(e.nativeEvent.layout.height)}
          >
            {chartSeries.data.map((d) => {
              const height = chartHeight > 0 ? Math.max(4, (d.value / chartSeries.maxValue) * chartHeight) : 4
              const isZero = d.value <= 0

              return (
                <View key={d.label} style={styles.chartBarColumn}>
                  <View
                    style={[
                      styles.chartBar,
                      { height },
                      isZero && styles.chartBarZero,
                    ]}
                  />
                  <Text style={styles.chartLabel}>{d.label}</Text>
                </View>
              )
            })}
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
                <Text style={[styles.statusText, comm.status === 'pending' && styles.statusTextPending]}>
                  {comm.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.commFooter}>
              <Text style={styles.date}>{new Date(comm.created_at).toLocaleDateString()}</Text>
              <Text style={styles.amount}>{formatPrice(Number(comm.amount_mxn))}</Text>
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
    backgroundColor: COLORS.muted,
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
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginBottom: SPACING.sm,
  },
  summaryAmount: {
    color: COLORS.white,
    fontSize: 36,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.lg,
    letterSpacing: -1,
  },
  summaryFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: SPACING.md,
    gap: 32,
  },
  footerItem: {},
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  footerValue: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chartCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  chartArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  chartBar: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  chartBarZero: {
    opacity: 0.25,
  },
  chartLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  filterBar: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    marginHorizontal: -4,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
  },
  commCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.background,
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
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  renterName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  statusPending: {
    backgroundColor: COLORS.accent,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    color: COLORS.text,
  },
  statusTextPending: {
    color: COLORS.white,
  },
  commFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  amount: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
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
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
