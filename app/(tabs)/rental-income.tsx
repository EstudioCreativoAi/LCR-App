import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native'
import { TrendingUp, Home, DollarSign } from 'lucide-react-native'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import { formatPrice } from '../../src/utils/currency'

interface PropertyIncome {
  propertyId: string
  address: string
  city: string
  totalReceived: number
  paymentCount: number
}

interface IncomeSummary {
  totalReceived: number
  byProperty: PropertyIncome[]
}

const IS_WEB = Platform.OS === 'web'
const MAX_CONTENT_WIDTH = 800

const MOCK_SUMMARY: IncomeSummary = {
  totalReceived: 240000,
  byProperty: [
    { propertyId: 'mock-1', address: 'Villa del Mar #45', city: 'Cabo San Lucas', totalReceived: 170000, paymentCount: 2 },
    { propertyId: 'mock-2', address: 'Condo Pacifico Penthouse', city: 'San Jose del Cabo', totalReceived: 70000, paymentCount: 1 },
  ],
}

export default function RentalIncomeScreen() {
  const { session, role, isDemo } = useSession()
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchIncome = useCallback(async () => {
    if (isDemo) {
      setSummary(MOCK_SUMMARY)
      setLoading(false)
      return
    }
    if (!session?.user.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount_mxn,
        payment_type,
        status,
        lease_id,
        lease:leases (
          id,
          property:properties (id, address, city)
        )
      `)
      .eq('recipient_id', session.user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const byPropertyMap: Record<string, PropertyIncome> = {}
      let total = 0

      data.forEach((p: any) => {
        const property = p.lease?.property
        if (!property) return
        total += Number(p.amount_mxn)
        if (!byPropertyMap[property.id]) {
          byPropertyMap[property.id] = {
            propertyId: property.id,
            address: property.address,
            city: property.city,
            totalReceived: 0,
            paymentCount: 0,
          }
        }
        byPropertyMap[property.id].totalReceived += Number(p.amount_mxn)
        byPropertyMap[property.id].paymentCount += 1
      })

      setSummary({
        totalReceived: total,
        byProperty: Object.values(byPropertyMap),
      })
    }
    setLoading(false)
  }, [session?.user.id, isDemo])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  if (!role || (role !== 'landlord' && role !== 'agent')) return null

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchIncome}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <Text style={styles.screenTitle}>Rental Income</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <>
              {/* Total received card */}
              <View style={styles.totalCard}>
                <View style={styles.totalIconWrap}>
                  <TrendingUp size={28} color={COLORS.white} strokeWidth={2} />
                </View>
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Total Received</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(summary?.totalReceived ?? 0)}
                  </Text>
                  <Text style={styles.totalSub}>From completed payments</Text>
                </View>
              </View>

              {/* Per-property breakdown */}
              <Text style={styles.sectionTitle}>By Property</Text>

              {(summary?.byProperty.length ?? 0) === 0 ? (
                <View style={styles.emptyContainer}>
                  <DollarSign size={48} color={COLORS.muted} strokeWidth={1.5} />
                  <Text style={styles.emptyTitle}>No payments received yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Payments will appear here once renters complete their deposit
                  </Text>
                </View>
              ) : (
                summary!.byProperty.map((prop) => (
                  <View key={prop.propertyId} style={styles.propertyCard}>
                    <View style={styles.propertyIconWrap}>
                      <Home size={20} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyAddress} numberOfLines={1}>
                        {prop.address}
                      </Text>
                      <Text style={styles.propertyCity}>{prop.city}</Text>
                      <Text style={styles.propertyPayments}>
                        {prop.paymentCount} {prop.paymentCount === 1 ? 'payment' : 'payments'}
                      </Text>
                    </View>
                    <Text style={styles.propertyAmount}>
                      {formatPrice(prop.totalReceived)}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: COLORS.white,
    ...(IS_WEB
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : {}),
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 60,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  centered: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  totalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  totalSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  propertyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyAddress: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 1,
  },
  propertyCity: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    marginBottom: 2,
  },
  propertyPayments: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.secondary,
  },
  propertyAmount: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
})
